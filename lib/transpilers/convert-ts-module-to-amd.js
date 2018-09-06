import * as ts from 'typescript';
import convertESModuleToAMD from './convert-es-module-to-amd';

export default function(codeString, { moduleName=null }) {
  const transpiledCode = ts.transpileModule(codeString.toString(), {
    moduleName: moduleName,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ES2015, target: ts.ScriptTarget.ES2015, reportDiagnostics: true,
     }
  }).outputText;

  return convertESModuleToAMD(transpiledCode, { moduleName: moduleName });
}
