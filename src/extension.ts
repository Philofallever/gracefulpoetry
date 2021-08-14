// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as path from "path";
import * as vscode from 'vscode';
import * as gracefulpoetry from "./gracefulpoetry";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let _context: vscode.ExtensionContext;
let _starList: gracefulpoetry.entry[] = [];
export async function activate(context: vscode.ExtensionContext)
{
    _context = context;
    gracefulpoetry.onActivate(context);
    vscode.window.registerWebviewViewProvider(PoetryView.viewId, new PoetryView(context));
    vscode.commands.registerCommand("gracefulpoetry.refresh", PoetryView.refresh);
    vscode.commands.registerCommand("gracefulpoetry.star", gracefulpoetry.starCurrEntry);
    vscode.commands.registerCommand("gracefulpoetry.unstar", gracefulpoetry.unstarCurrEntry);
    vscode.commands.registerCommand("gracefulpoetry.all", gracefulpoetry.all);
    vscode.commands.registerCommand("gracefulpoetry.ci", gracefulpoetry.ci);
    vscode.commands.registerCommand("gracefulpoetry.poetry", gracefulpoetry.poetry);
    vscode.commands.registerCommand("gracefulpoetry.allscope", gracefulpoetry.allscope);
    vscode.commands.registerCommand("gracefulpoetry.starscope", gracefulpoetry.starscope);

}

// this method is called when your extension is deactivated
export function deactivate()
{
    gracefulpoetry.onDeactive();
}

class PoetryView implements vscode.WebviewViewProvider
{
    static readonly viewId = "gracefulPoetry.view";
    static instance?: PoetryView;
    private extContext: vscode.ExtensionContext;
    private _view?: vscode.WebviewView;

    constructor(context: vscode.ExtensionContext)
    {
        this.extContext = context;
        PoetryView.instance = this;
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

        this.getHtmlForWebview(webviewView.webview).then(x => webviewView.webview.html = x);
    }

    private async getHtmlForWebview(webview: vscode.Webview)
    {
        let uri = this.extContext.extensionUri;
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(uri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(uri, 'media', 'main.css'));
        let entry = await gracefulpoetry.getPopularEntry();
        let title = entry.title ?? entry.rhythmic;
        let author = entry.author;
        let paras = entry.paragraphs;
        let list: string[] = new Array(paras.length);
        gracefulpoetry.setCurrViewEntry(entry);
        paras.forEach((item, index, _) =>
        {
            item = `<li>${item}</li>`;
            list[index] = item;
        });
        let content = list.join('\n');

        return `
<!DOCTYPE html>
<html lang="zh">

<head>
    <meta charset="UTF-8">
    <!-- <link href="${styleVSCodeUri}" rel="stylesheet"> -->
    <link href="${styleMainUri}" rel="stylesheet">
    <title>唐诗宋词</title>
</head>

<body>
<div style="width: 100%;">
    <div style="margin-top: 0px;margin-bottom: -40px;box-sizing: border-box;">
        <div style="width: 100%;font-size: 0px;box-sizing: border-box;">
            <div style="margin-left: 24px;margin-right: 24px;border-bottom: 1px solid #000000;box-sizing: border-box;"></div>
            <div style="float: left;margin-top: -1px;background-color: transparent !important;box-sizing: border-box;">
                <div style="width: 0px;height: 8px;border-left: 1px solid #000000;margin-left: 23px;box-sizing: border-box;"></div>
                <div style="width: 16px;margin-left: 8px;box-sizing: border-box;">
                    <div style="width: 16px;height: 8px;border-left: 1px solid #000000;border-right: 1px solid #000000;border-bottom: 1px solid #000000;box-sizing: border-box;"></div>
                    <div style="width: 8px;height: 16px;margin-top: -8px;border-top: 1px solid #000000;border-right: 1px solid #000000;border-bottom: 1px solid #000000;box-sizing: border-box;"></div>
                </div>
                <div style="width: 8px;height: 16px;border-top: 1px solid #000000;border-left: 1px solid #000000;margin-top: -1px;box-sizing: border-box;"></div>
            </div>
            <div style="float: right;margin-top: -1px;background-color: transparent !important;box-sizing: border-box;">
                <div style="width: 0px;height: 8px;border-right: 1px solid #000000;margin-right: 8px;box-sizing: border-box;"></div>
                <div style="width: 16px;margin-top: -1px;box-sizing: border-box;">
                    <div style="width: 16px;height: 8px;border-right: 1px solid #000000;border-left: 1px solid #000000;border-bottom: 1px solid #000000;box-sizing: border-box;"></div>
                    <div style="width: 8px;height: 16px;margin-top: -8px;margin-left: 8px;border-left: 1px solid #000000;border-bottom: 1px solid #000000;border-top: 1px solid #000000;box-sizing: border-box;"></div>
                </div>
                <div style="width: 8px;height: 16px;margin-top: -1px;margin-left: 16px;border-top: 1px solid #000000;border-right: 1px solid #000000;border-left-color: #000000;box-sizing: border-box;"></div>
            </div>
        </div>
        <div style="clear: both;box-sizing: border-box;"></div>
        <div style="width: 100%;margin-top: -12px;margin-bottom: -12px;padding-right: 20px;padding-left: 20px;box-sizing: border-box;"></div>
    </div>
</div>
<h3>${title}</h3>
<dd>${author}</dd>
<ul>
    ${content}
</ul>
<div style="width: 100%;margin-top: -40px;font-size: 0px;box-sizing: border-box;">
    <div style="float: left;margin-top: -1px;background-color: transparent !important;box-sizing: border-box;">
        <div style="width: 8px;height: 16px;border-bottom: 1px solid #000000;border-left: 1px solid #000000;margin-top: -1px;border-top-color: #000000;box-sizing: border-box;"></div>
        <div style="width: 16px;margin-left: 8px;margin-top: -1px;box-sizing: border-box;">
            <div style="width: 8px;height: 16px;border-bottom: 1px solid #000000;border-right: 1px solid #000000;border-top: 1px solid #000000;box-sizing: border-box;"></div>
            <div style="width: 16px;height: 8px;margin-top: -8px;border-top: 1px solid #000000;border-right: 1px solid #000000;border-left: 1px solid #000000;box-sizing: border-box;"></div>
        </div>
        <div style="width: 0px;height: 8px;border-left: 1px solid #000000;margin-left: 23px;box-sizing: border-box;"></div>
    </div>
    <div style="float: right;margin-top: -2px;background-color: transparent !important;box-sizing: border-box;">
        <div style="width: 8px;height: 16px;margin-bottom: 1px;margin-left: 16px;border-bottom: 1px solid #000000;border-right: 1px solid #000000;box-sizing: border-box;"></div>
        <div style="width: 16px;margin-top: -2px;box-sizing: border-box;">
            <div style="width: 8px;height: 16px;margin-left: 8px;border-top: 1px solid #000000;border-left: 1px solid #000000;border-bottom: 1px solid #000000;box-sizing: border-box;"></div>
            <div style="width: 16px;height: 8px;margin-top: -8px;margin-right: 18px;border-left: 1px solid #000000;border-right: 1px solid #000000;border-top: 1px solid #000000;box-sizing: border-box;"></div>
        </div>
        <div style="width: 0px;height: 8px;border-right: 1px solid #000000;border-left-color: #000000;border-bottom-color: #000000;box-sizing: border-box;"></div>
    </div>
    <div style="clear: both;box-sizing: border-box;"></div>
    <div style="margin-top: -1px;margin-left: 24px;margin-right: 24px;border-top: 1px solid #000000;box-sizing: border-box;"></div>
</div>

</body>

</html>`;
    }

    static refresh(): void 
    {
        if (PoetryView.instance === undefined)
            return;

        if (PoetryView.instance._view === undefined)
            return;

        PoetryView.instance.getHtmlForWebview(PoetryView.instance._view.webview).then(x =>
        {
            PoetryView.instance!._view!.webview.html = x;
        });
    }
}