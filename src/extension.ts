import * as vscode from 'vscode';

const react = require('../snippets/react.json');
const antd = require('../snippets/antd.json');
const regexps = require('../snippets/regexps.json');
const imports = require('../snippets/imports.json');
const ahooks = require('../snippets/ahooks.json');

const getEmptyLineNumber = () => {
  const document = vscode.window.activeTextEditor?.document as vscode.TextDocument;
  
  const lineCount = document.lineCount;

  for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
    let lineText = document.lineAt(lineNumber);
    if (!lineText.text.match(/\w/g)) return lineNumber;
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
        const { title, prefix = "", body, description, dependencies } = content as any;
        const value = typeof prefix === 'string' ? prefix : prefix[0]

        return {
          id: index,
          description: description || shortDescription,
          label: title || shortDescription || value,
          value,
          body,
          dependencies
        }
      }
    )
    const snippet: any = await vscode.window.showQuickPick(items, options);

    if (!snippet) return;

    const activeTextEditor = vscode.window.activeTextEditor;
    const body = typeof snippet.body === 'string' ? snippet.body : snippet.body.join('\n');

    await activeTextEditor?.insertSnippet(new vscode.SnippetString(body));
  }

	context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsReact', () => {
    snippetsCommand(react);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsAntDesign', () => {
    snippetsCommand(antd);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsRegexp', () => {
    snippetsCommand(regexps);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('vscode-ragnarok-snippets-plugin.snippetsAHooks', () => {
    snippetsCommand(ahooks);
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

    if (!snippet) return;

    const activeTextEditor = vscode.window.activeTextEditor;
    const {
      moduleName,
      dependency,
      ImportAnEntireModulesContents,
      ImportingDefaults
    } = snippet;
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    // es6 import regex
    const MDRegexp = /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)(?:(?:".*?")|(?:'.*?'))[\s]*?(?:;|$|)/g;
    let currentDoc = vscode.window.activeTextEditor?.document.getText();
    const document = vscode.window.activeTextEditor?.document as vscode.TextDocument;
    const isExistImports = currentDoc?.match(MDRegexp);
    
    const moduleNameRegEx = new RegExp(`(\\s|{)${moduleName}(\\s|})`);
    const dependencyRegEx = new RegExp(`('|")${dependency}('|")`);
    // 导入模块已经存在
    if (isExistImports && isExistImports.length > 0 && isExistImports.some(pattern => moduleNameRegEx.test(pattern) && dependencyRegEx.test(pattern))) return;

    // 依赖是否存在
    const foundImport = isExistImports?.find(pattern => dependencyRegEx.test(pattern) && pattern.replace(/{|}/gi, '') !== pattern);
    
    // 依赖不存在，则创建导入语句
    if (!foundImport) {
      const emptyLineNumber = getEmptyLineNumber();

      if (ImportingDefaults) {
        return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import ${moduleName} from '${dependency}';\n`), new vscode.Position(emptyLineNumber, 0));
      }

      if (ImportAnEntireModulesContents) {
        return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import * as ${moduleName} from '${dependency}';\n`), new vscode.Position(emptyLineNumber, 0));
      }

      return activeTextEditor?.insertSnippet(new vscode.SnippetString(`import { ${moduleName} } from '${dependency}';\n`), new vscode.Position(emptyLineNumber, 0));
    }

    // 依赖存在，则改写导入语句
    // @ts-ignore
    let nextImport = foundImport
      .replace(/{|}|from|import|'|"|[^A-Za-z0-9_,]|;/gi, '')
      .replace(dependency, '')
      .split(',')
      .concat(moduleName);

    currentDoc = currentDoc?.replace(foundImport, `import { ${Array.from(new Set(nextImport)).join(', ')} } from '${dependency}';`);

    edit.replace(document.uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(99999, 99999)), currentDoc as string);
    return vscode.workspace.applyEdit(edit);
  }));
}

export function deactivate() {}
