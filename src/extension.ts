// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as gracefulpoetry from "./gracefulpoetry";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext)
{
    gracefulpoetry.onActivate(context);
    let disposable = vscode.commands.registerCommand('gracefulpoetry.helloWorld', async () =>
    {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from GracefulPoetry!');
        let x = await gracefulpoetry.getPopularEntry();
        console.log("111111111111", x);
    });

    let d = vscode.window.registerWebviewViewProvider(PoetryView.viewId, new PoetryView(context));
}

// this method is called when your extension is deactivated
export function deactivate() { }


class PoetryView implements vscode.WebviewViewProvider
{
    static readonly viewId = "gracefulPoetry.view";

    private extContext: vscode.ExtensionContext;
    private _view?: vscode.WebviewView;


    constructor(context: vscode.ExtensionContext)
    {
        this.extContext = context;
    }

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void>
    {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            localResourceRoots: [
                this.extContext.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        // webviewView.webview.onDidReceiveMessage(data =>
        // {
        //     switch (data.type)
        //     {
        //         case 'colorSelected':
        //             {
        //                 vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
        //                 break;
        //             }
        //     }
        // });
    }

    private getHtmlForWebview(webview: vscode.Webview)
    {
        let uri = this.extContext.extensionUri;
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(uri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(uri, 'media', 'main.css'));


        return `<!DOCTYPE html>

    <html lang="zh">

    <head>
        <meta charset="UTF-8">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>唐诗宋词</title>
    </head>

    <body>
    </body>

    </html>`;
    }
}