import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-js';
import Console from '../lib/utils/console';
import importAddonToAMD from '../lib/utils/import-addon-to-amd';
import searchInParentDirectories from '../lib/utils/search-in-parent-directories';
import countTime from '../lib/utils/count-time';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

function build(environment, options={ excludeJQuery: false, excludeEmberData: false }) {
  const FILENAME = getFileName(environment, options);

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();
    const PROJECT_PATH = searchInParentDirectories(process.cwd(), 'package.json')
      .replace('/package.json', '');
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/${FILENAME}.js`;

    return Promise.all(readBuildFiles(PROJECT_PATH, environment, options))
      .then((fileContents) => writeVendorJS(OUTPUT_PATH, fileContents.join('\n'), environment))
      .then(() => {
        const timePassed = timer.stop();

        readFileAsync(OUTPUT_PATH).then((fileBuffer) => {
          Console.log(`${chalk.green('BUILT:')} ${FILENAME}.js in ${formatTimePassed(timePassed)} [${formatSize(fileBuffer.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: ${FILENAME}.js in ${timePassed}ms [${formatSize(fileBuffer.length)}] Environment: ${environment}`,
            fileBuffer: fileBuffer
          });
        })
      });
  });
}

function getFileName(environment, options) {
  if (options.excludeJQuery && options.excludeEmberData){
    return environment === 'production' ? 'only-ember-prod' : 'only-ember-debug';
  } else if (options.excludeEmberData) {
    return environment === 'production' ? 'no-ember-data-ember-prod' : 'no-ember-data-ember-debug';
  } else if (options.excludeJQuery) {
    return environment === 'production' ? 'no-jquery-ember-prod' : 'no-jquery-ember-debug';
  }

  return environment === 'production' ? 'full-ember-prod' : 'full-ember-debug';
}

function readBuildFiles(projectPath, environment, options={
  excludejQuery: false, excludeEmberData: false
}){
  const MODULE_PATH = `${projectPath}/node_modules`;
  const VENDOR_PATH = `${projectPath}/vendor`;

  let baseBuilds = [
    readFileAsync(`${MODULE_PATH}/loader.js/dist/loader/loader.js`),
    options.excludeJQuery ? new Promise((resolve) => resolve('')) :
      readFileAsync(`${VENDOR_PATH}/jquery.js`),
    injectEmberJS(MODULE_PATH, environment),
    new Promise((resolve) => resolve(`
      define('@ember/ordered-set/index', ['exports'], function (exports) {
        exports.default = Ember.OrderedSet;
      });
    `)),
    importAddonToAMD('ember-inflector', 'ember-inflector/addon'),
  ];

  if (!options.excludeEmberData) {
    baseBuilds = baseBuilds.concat(buildEmberData(projectPath, environment));
  }

  return baseBuilds.concat([
    importAddonToAMD('ember-load-initializers', 'ember-load-initializers/addon'),
    importAddonToAMD('ember-resolver', 'ember-resolver/addon')
  ]);
}

function injectEmberJS(modulePath, environment) {
  const emberDist = `${modulePath}/ember-source/dist`;
  const targetEmberBuild = environment === 'production' ? `${emberDist}/ember.prod.js` :
    `${emberDist}/ember.debug.js`;

  return readFileAsync(targetEmberBuild);
}

function buildEmberData(projectPath) {
  // NOTE: normally stripping -private but ember-data build sourcecode is a disaster
  const emberDataVersion = require(`${projectPath}/package.json`).devDependencies['ember-data'];

  return [
    importAddonToAMD('ember-data', 'ember-data/addon'),
    new Promise((resolve) => resolve(`
      define('ember-data/version', ['exports'], function (exports) {
        exports.default = '${emberDataVersion}';
      });
    `))
  ];
}

function writeVendorJS(path, content, environment) {
  if (environment === 'production') {
    const minified = UglifyJS.minify(content, {
      toplevel: true,
      compress: {
        negate_iife: false,
        sequences: 30
      }
    }).code;

    return writeFileAsync(path, minified);
  }

  return writeFileAsync(path, content);
}

const ARGUMENTS = readArguments();

['development', 'production'].forEach((environment) => build(environment, ARGUMENTS));

function readArguments() {
  return process.argv.slice(2).reduce((result, arg) => {
    if (arg.startsWith('--exclude-jquery')) {
      return Object.assign(result, { excludeJQuery: true });
    } else if (arg.startsWith('--exclude-ember-data')) {
      return Object.assign(result, { excludeEmberData: true });
    }

    return result;
  }, {});
}
