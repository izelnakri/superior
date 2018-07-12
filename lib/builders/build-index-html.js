import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import transpileIndexHTML from '../transpilers/transpile-index-html';

export default function(entrypoint, buildConfig={ projectRoot: null, ENV: {}, indexHTMLInjections: {} }) {
  const projectRoot = buildConfig.projectRoot || findProjectRoot();
  const indexHTMLInjections = buildConfig.indexHTMLInjections || {};
  const ENV = buildConfig.ENV || {};

  return new Promise((resolve) => {
    fs.readFile(entrypoint).then((htmlBuffer) => {
      return fs.writeFile(
        `${projectRoot}/tmp/index.html`,
        transpileIndexHTML(htmlBuffer.toString(), ENV, indexHTMLInjections)
      );
    }).then(() => resolve(true))
    .catch((error) => console.log('buildIndexHTML ERROR:', error));
  });
}