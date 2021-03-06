/* eslint-disable curly */
import * as vscode from "vscode";
/* eslint-disable @typescript-eslint/naming-convention */

import * as fs from "fs";
import * as path from "path";
import { promises as fsPromise } from "fs";

let dataRoot: string;
let contentPath: string;
let rankPath: string;

const ciDirName = "ci";
const poetDirName = "poet";

const ciAuthorFileName = "author.song.json";
const poetAuthorFileName = "authors.tang.json";

const minTryTimes = 15;
const maxTryTimes = minTryTimes * 6;

interface logFunc { (message?: any, ...opt: any[]): void; }
let relaseLog: logFunc = function (message, ...opt) { };

let print: logFunc = console.log;
let printError: logFunc = console.error;

export enum liberType
{
    ci,
    poetry,
}

export interface rankEntry
{
    "author": string,
    "rhythmic"?: string,
    "title"?: string,
    "baidu": number,
    "so360": number,
    "google": number,
    "bing": number,
    "bing_en": number,
}

export interface authorEntry
{
    "id"?: string,
    "name": string,
    "desc"?: string,
    "description"?: string,
    "short_description"?: string;
}

export interface entry
{
    "title"?: string,
    "rhythmic"?: string,
    "tags"?: string[],
    "author": string,
    "author_info"?: authorEntry,
    "paragraphs": string[],
    "rank": number,
}

let extContext: vscode.ExtensionContext;
export function onActivate(context: vscode.ExtensionContext): void
{
    extContext = context;
    dataRoot = path.join(context.extensionPath, "data");
    contentPath = path.join(dataRoot, "content");
    rankPath = path.join(dataRoot, "rank");
    print = context.extensionMode === vscode.ExtensionMode.Development ? console.log : relaseLog;
    printError = context.extensionMode === vscode.ExtensionMode.Development ? console.log : relaseLog;
    print(dataRoot);
    // checkAuthors();
    checkFileMatch();
    loadStarList();
    setClassifyAll();
    setScopeAll();
}

export function onDeactive()
{
    saveStarList();
}

let _currViewEntry: entry;
// 当前webview显示的条目
export function setCurrViewEntry(entry: entry)
{
    _currViewEntry = entry;
    setStarContext(isCurrStarred());
}


async function loadJson<T>(path: string): Promise<T[]>
{
    let a = await fsPromise.readFile(path, { encoding: "utf-8", flag: "r" });
    let b: T[] = JSON.parse(a);
    return b;
}

async function checkAuthors(): Promise<Map<string, authorEntry>>
{
    let authorList: authorEntry[] = [];
    let ciAuthorPath = path.join(contentPath, ciDirName, ciAuthorFileName);
    let poetAuthorPath = path.join(contentPath, poetDirName, poetAuthorFileName);
    for (const filePath of [ciAuthorPath, poetAuthorPath])
    {
        let content = await fsPromise.readFile(filePath, { encoding: "utf-8", flag: "r" });
        let list: authorEntry[] = JSON.parse(content);
        authorList = authorList.concat(list);
    }

    let map: Map<string, authorEntry> = new Map();
    const remove: authorEntry[] = [];
    let count = 0;
    for (const author of authorList)
    {
        if (map.has(author.name))
        {
            ++count;
            if (author.description)
            {
                const old = map.get(author.name) as authorEntry;
                if (author.description !== old.description || author.short_description || old.short_description)
                {
                    // print("1",author,map.get(author.name),author == map.get(author.name))
                    remove.push(map.get(author.name) as authorEntry);
                    map.set(author.name, author);
                }
            }
            else
                remove.push(author);

        }
        else
            map.set(author.name, author);
    }

    // print(remove);
    remove.forEach(x =>
    {
        const i = authorList.indexOf(x);
        authorList.splice(i, 1);
    });
    map.clear();
    authorList.forEach(x => map.set(x.name, x));
    // print(`ci authors length: ${authorList.length} ${map.size},重复的: ${count} ${remove.length}`);
    return map;
}

export async function checkFileMatch(): Promise<void>
{
    for (const dirName of [ciDirName, poetDirName])
    {
        const dirPath = path.join(contentPath, dirName);
        const dir = await fsPromise.opendir(dirPath);
        for await (const entry of dir)
        {
            if (!entry.name.includes("author"))
            {
                let [first, second, ...rest] = entry.name.split('.');
                let temp = [first, second, "rank", ...rest];
                const rankFilePath = path.join(rankPath, dirName, temp.join("."));
                if (!fs.existsSync(rankFilePath))
                {
                    printError("rank file is not existed!", entry.name, rankFilePath);
                    return;
                }
                const poetFilePath = path.join(contentPath, dirName, entry.name);
                let text1 = await fsPromise.readFile(poetFilePath, { encoding: "utf-8" });
                let list1 = JSON.parse(text1) as entry[];

                let text2 = await fsPromise.readFile(rankFilePath, { encoding: "utf-8" });
                let list2 = JSON.parse(text2) as rankEntry[];

                if (list1.length !== list2.length)
                {
                    printError("entry count doesn't match", entry.name, "poet:", list1.length, "rank:", list2.length);
                    for (let index = 0; index < Math.min(list1.length, list2.length); index++)
                    {
                        const entry = list1[index];
                        const rank = list2[index];
                        const title = entry.rhythmic ?? entry.title;
                        const author = entry.author;

                        if (rank.author !== author || (rank.title ?? rank.rhythmic) !== title)
                        {
                            printError("index:", index, "entry:", entry, "rank:", rank);
                            break;
                        }
                    }
                }
            }
        }
    }
    print("check success,all poet/ci file has its rank file!");
}


let _starList: entry[];
async function loadStarList(): Promise<void>
{
    try
    {
        let filePath = path.join(extContext.extensionPath, "starlist.json");
        _starList = await loadJson<entry>(filePath);
    } catch (error)
    {
        _starList = [];
    }
    finally
    {
        print(`收藏列表长度${_starList.length}`);
    }
}

async function saveStarList()
{
    if (!_starList) return;

    let filePath = path.join(extContext.extensionPath, "starlist.json");
    fs.writeFile(filePath, JSON.stringify(_starList), function ()
    {
        print("save ok")!;
    });
}

export async function getRandomliber(liberRandArg?: liberType | number): Promise<[entry, entry[]]>
{
    let liberDirName = ciDirName;
    switch (typeof liberRandArg)
    {
        case "undefined":
            liberDirName = Math.random() > 0.5 ? ciDirName : poetDirName;
            break;
        case "number":
            liberDirName = Math.random() <= liberRandArg ? poetDirName : ciDirName;
            break;
        default:
            liberDirName = liberRandArg === liberType.ci ? ciDirName : poetDirName;
            break;
    }
    let p = path.join(contentPath, liberDirName);
    const d = await fsPromise.readdir(p);
    let f = "";
    do
    {
        f = d[Math.floor(Math.random() * (d.length - 1))];
    } while (f.includes("author"));
    p = path.join(p, f);
    print(p);
    const entries = await loadJson<entry>(p);
    let index = Math.floor(Math.random() * (entries.length - 1));
    const [first, second, ...rest] = f.split(".");
    const rankFileName = [first, second, "rank", ...rest].join(".");
    const rankFilePath = path.join(rankPath, liberDirName, rankFileName);
    const ranks = await loadJson<rankEntry>(rankFilePath);
    entries.forEach((x, index) =>
    {
        const rank = ranks[index];
        // 修正rank数据,错的也太远了
        let score = rank ? rank.baidu : 0;

        let t = x.rhythmic ?? x.title;
        if (x.author.length < 2 || (t && t.length < 2))
        {
            while (score > 10000)
                score /= 10;
        }

        if (score >= 10000000)
            score /= Math.random() * 1000000;

        x.rank = score;
    });

    const entry = entries[index];
    return checkEntry(entry) ? [entry, entries] : await getRandomliber(liberRandArg);
}

function checkEntry(entry: entry): boolean
{
    let content = entry.paragraphs;
    return content.length > 3;
}

export async function getRankestEntryInSeveralTimes(count?: number, liberRandArg?: number | liberType): Promise<entry>
{
    count = minTryTimes + Math.random() * ((count ?? maxTryTimes) - minTryTimes);
    let result: entry | undefined = undefined;
    do
    {
        const [item] = await getRandomliber(liberRandArg);
        if (result === undefined || result.rank < item.rank)
            result = item;

    } while (--count > 0);

    return <entry>result;
}

let currLiberType: liberType | undefined = undefined;
let isStarScope = false;
let lastEntry: entry | undefined;
export async function getPopularEntry(): Promise<entry>
{

    if (isStarScope)
    {
        if (_starList.length > 0)
        {
            lastEntry = _starList[Math.floor(Math.random() * (_starList.length - 1))];
            return lastEntry;
        }
        else
            vscode.window.showErrorMessage("尚未收藏任何诗词");
    }

    if (lastEntry === undefined)
        [lastEntry] = await getRandomliber(currLiberType);

    const item = await getRankestEntryInSeveralTimes(5, currLiberType);
    if (item.rank > lastEntry.rank)
    {
        lastEntry = item;
        return item;
    }

    // 开始衰减
    let x = 1;

    while (x <= 20)
    {
        let r = lastEntry.rank * 1 / (1 + 0.05 * Math.pow(lastEntry.rank > 1000000 ? 21 : 7, x));
        let [entry, entryList] = await getRandomliber(currLiberType);
        print(x, lastEntry, entry);
        if (entry.rank > r)
        {
            lastEntry = entry;
            return entry;
        }
        else
        {
            for (const entry of entryList)
            {
                if (entry.rank > r && checkEntry(entry))
                {
                    lastEntry = entry;
                    return entry;
                }
            }
        }
        ++x;
    }

    [lastEntry] = await getRandomliber(currLiberType);
    return lastEntry;
}

export function starCurrEntry(): void
{
    if (!_currViewEntry) return;

    if (isCurrStarred()) return;

    _starList.push(_currViewEntry);

    setStarContext(true);
}

export function unstarCurrEntry(): void
{
    if (!_currViewEntry) return;

    if (!isCurrStarred()) return;

    let index = _starList.findIndex(isEqualCurrEntry);
    if (index !== - 1)
        _starList.splice(index, 1);
    setStarContext(false);
}

export function isCurrStarred(): boolean
{
    if (!_starList) return false;

    if (!_currViewEntry) return false;

    return _starList.findIndex(isEqualCurrEntry) !== - 1;
}

export function setClassifyAll()
{
    currLiberType = undefined;
    setClassifyContext(0);
}

export function setClassifyCi()
{
    currLiberType = liberType.ci;
    setClassifyContext(1);
}

export function setClassifyPoetry()
{
    currLiberType = liberType.poetry;
    setClassifyContext(2);
}

export function setScopeAll()
{
    isStarScope = false;
    setScopeContext(false);
}

export function setScopeStarred()
{
    isStarScope = true;
    setScopeContext(true);
}

function isEqualCurrEntry(item: entry): boolean
{
    if (!item || !_currViewEntry) return false;

    if (_currViewEntry.author !== item.author || _currViewEntry.rhythmic !== item.rhythmic || _currViewEntry.title !== item.title) return false;

    if (_currViewEntry.paragraphs.length !== item.paragraphs.length) return false;

    for (let index = 0; index < _currViewEntry.paragraphs.length; index++)
    {
        if (_currViewEntry.paragraphs[index] !== item.paragraphs[index])
            return false;
    }

    return true;
}


function setStarContext(value: boolean): void
{
    vscode.commands.executeCommand("setContext", 'gracefulpoetry.star', value);
}

function setClassifyContext(value: number): void
{
    vscode.commands.executeCommand("setContext", 'gracefulpoetry.classify', value);
}

function setScopeContext(value: boolean)
{
    vscode.commands.executeCommand("setContext", 'gracefulpoetry.starscope', value);
}
