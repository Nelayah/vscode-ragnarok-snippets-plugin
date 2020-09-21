// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface IConfig {
  moduleName: string,
  dependency: string,
  allowSyntheticDefaultImports?: boolean,
  entireModuleContents?: boolean
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-ragnarok-snippets-plugin" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
    // vscode.window.showInformationMessage('Hello World from vscode-ragnarok-snippets-plugin!');

    const activeTextEditor = vscode.window.activeTextEditor;
    const mergeImports = (config: IConfig) => {
      const {moduleName, dependency, allowSyntheticDefaultImports, entireModuleContents} = config;
      const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
      const DRegexp = new RegExp(`(?:import)(.|\\s)*(?:from)(.|\\s)*\\W(?:${dependency})(?:\'|\")`);
      const MDRegexp = new RegExp(`(?:import)(.|\\s)*\\W(?:${moduleName})\\W(.|\\s)*(?:from)(.|\\s)*\\W(?:${dependency})(?:\'|\")`);
      let currentDoc = vscode.window.activeTextEditor?.document.getText();
      
      const isExistImport = currentDoc?.match(MDRegexp);
      // 导入模块已经存在
      if (isExistImport && isExistImport.length > 0) return;

      // 依赖是否存在
      const foundImport = currentDoc?.match(DRegexp);
      
      // 依赖不存在，则创建导入语句
      if (!foundImport) {
        if (allowSyntheticDefaultImports) {
          return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import ${moduleName} from "${dependency}";`), new vscode.Position(0, 0));
        }
  
        if (entireModuleContents) {
          return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import * as ${moduleName} from "${dependency}";`), new vscode.Position(0, 0));
        }

        return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import { ${moduleName} } from "${dependency}";`), new vscode.Position(0, 0));
      }

      // 依赖存在，则改写导入语句
      let nextImport = foundImport[0]
        .replace(/{|}|from|import|'|"|[^A-Za-z0-9_,]|;/gi, '')
        .replace(dependency, '')
        .split(',')
        .concat(moduleName)

      currentDoc = currentDoc?.replace(DRegexp, `import { ${nextImport.join(', ')} } from "${dependency}"`);

      edit.replace((vscode.window.activeTextEditor?.document as vscode.TextDocument).uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(99999, 99999)), currentDoc as string);
      vscode.workspace.applyEdit(edit);
    };

    mergeImports({moduleName: 'R', dependency: 'ramda'});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
