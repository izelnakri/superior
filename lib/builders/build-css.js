import fs from 'fs-extra';
import { promisify } from 'util';
import chalk from 'chalk';
import sass from 'node-sass';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const compileScssAsync = promisify(sass.render);

export default function(environment='development') {
  const PROJECT_ROOT = findProjectRoot();
  const STYLES_ROOT = `${PROJECT_ROOT}/src/ui/styles/application.scss`;

  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.css...');

    const timer = countTime();
    const scssFiles = await lookup(`${PROJECT_ROOT}/src/ui`, 'scss', {
      filter(item) {
        return !item.path.includes(`${PROJECT_ROOT}/src/ui/styles`);
      }
    }) || [];

    return Promise.all([STYLES_ROOT].concat(scssFiles).map((scssFile) => fs.readFile(scssFile)))
      .then((scssContent) => {
        return compileScssAsync({
          data: scssContent.join('\n'),
          outputStyle: ['production', 'demo'].includes(environment) ? 'compressed' : 'expanded',
          sourceMap: true,
          includePaths: [`${PROJECT_ROOT}/src/ui/styles`]
        });
      }).then((result) => {
        const compiledCSS = result.css.toString();

        return fs.writeFile(`${PROJECT_ROOT}/tmp/assets/application.css`, compiledCSS).then(() => {
          const timePassed = timer.stop();

          Console.log(`${chalk.green('BUILT:')} application.css in ${formatTimePassed(timePassed)} [${formatSize(compiledCSS.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: application.css in ${timePassed}ms [${formatSize(compiledCSS.length)}] Environment: ${environment}`,
            size: compiledCSS.length
          });
        });
      }).catch((error) => {
        Console.error('CSS build error:');
        console.log(error);
      });
  });
}