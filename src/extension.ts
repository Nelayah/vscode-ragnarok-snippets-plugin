import * as vscode from 'vscode';

const react = require('../snippets/react.json');
const imports = require('../snippets/imports.json');

const getEmptyLineNumber = () => {
  const document = vscode.window.activeTextEditor?.document as vscode.TextDocument;
  
  const lineCount = document.lineCount;

  for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
    let lineText = document.lineAt(lineNumber);
    if (lineText.text.match(/\S|/g)) return lineNumber;
  }

  return 0;
}

export function activate(context: vscode.ExtensionContext) {

  console.log('Congratulations, your extension "vscode-ragnarok-snippets-plugin" is now active!');

  const snippetsCommand = async (tpl: any) => {
    const options = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Loading Snippets (pick one...)',
    }

    const snippetsArray = Object.entries(tpl);
    const items = snippetsArray.map(
      ([shortDescription, content], index) => {
        const { title, prefix, body, description, dependencies } = content as any;
        const value = typeof prefix === 'string' ? prefix : prefix[0]

        return {
          id: index,
          description: description || shortDescription,
          label: title || value,
          value,
          body,
          dependencies
        }
      }
    )
    const snippet: any = await vscode.window.showQuickPick(items, options);
    const activeTextEditor = vscode.window.activeTextEditor;
    const body = typeof snippet.body === 'string' ? snippet.body : snippet.body.join('\n');

    await activeTextEditor?.insertSnippet(new vscode.SnippetString(body));
  }

	context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsReact', () => {
    snippetsCommand(react);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsImport', async () => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
    const options = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Import package',
    }

    const snippetsArray = Object.entries(imports);
    const items = snippetsArray.map(
      ([shortDescription, content], index) => {
        const {
          title,
          moduleName,
          dependency,
          ImportExportsFromModule = false,
          ImportAnEntireModulesContents = false,
          ImportingDefaults = false
        } = content as any;

        return {
          id: index,
          description: shortDescription,
          label: title || moduleName || shortDescription,
          body: '',
          moduleName,
          dependency,
          ImportExportsFromModule,
          ImportAnEntireModulesContents,
          ImportingDefaults
        }
      }
    )
    const snippet: any = await vscode.window.showQuickPick(items, options);

    const activeTextEditor = vscode.window.activeTextEditor;
    const {
      moduleName,
      dependency,
      ImportAnEntireModulesContents,
      ImportingDefaults
    } = snippet;
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    const DRegexp = new RegExp(`(?:import)(.|\\s)*{(.|\\s)*}(.|\\s)*(?:from)(.|\\s)*\\W(?:${dependency})(?:\'|\")`);
    const MDRegexp = new RegExp(`(?:import)(.|\\s)*\\W(?:${moduleName})\\W(.|\\s)*(?:from)(.|\\s)*\\W(?:${dependency})(?:\'|\")`);
    let currentDoc = vscode.window.activeTextEditor?.document.getText();
    const document = vscode.window.activeTextEditor?.document as vscode.TextDocument;
    const isExistImport = currentDoc?.match(MDRegexp);
    
    // 导入模块已经存在
    if (isExistImport && isExistImport.length > 0) return;

    // 依赖是否存在
    const foundImport = currentDoc?.match(DRegexp);
    
    // 依赖不存在，则创建导入语句
    if (!foundImport) {
      const emptyLineNumber = getEmptyLineNumber();
      
      if (ImportingDefaults) {
        return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import ${moduleName} from "${dependency}";\n`), new vscode.Position(emptyLineNumber, 0));
      }

      if (ImportAnEntireModulesContents) {
        return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import * as ${moduleName} from "${dependency}";\n`), new vscode.Position(emptyLineNumber, 0));
      }

      return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import { ${moduleName} } from "${dependency}";\n`), new vscode.Position(emptyLineNumber, 0));
    }

    // 依赖存在，则改写导入语句
    let nextImport = foundImport[0]
      .replace(/{|}|from|import|'|"|[^A-Za-z0-9_,]|;/gi, '')
      .replace(dependency, '')
      .split(',')
      .concat(moduleName)

    currentDoc = currentDoc?.replace(DRegexp, `import { ${nextImport.join(', ')} } from "${dependency}"`);

    edit.replace(document.uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(99999, 99999)), currentDoc as string);
    return vscode.workspace.applyEdit(edit);
  }));
}

export function deactivate() {}
