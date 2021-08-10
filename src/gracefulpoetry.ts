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
    poet,
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
}

// public get context() :  {
//     return this._context;
// }
// public set context(v : ) {
//     this._context = v;
// }


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
    const entries = await loadJson<entry>(p);
    let index = Math.floor(Math.random() * (entries.length - 1));
    const entry = entries[index];
    const [first, second, ...rest] = f.split(".");
    const rankFileName = [first, second, "rank", ...rest].join(".");
    const rankFilePath = path.join(rankPath, liberDirName, rankFileName);
    const ranks = await loadJson<rankEntry>(rankFilePath);
    const rank = ranks[index];
    entry.rank = rank ? Math.floor(rank.baidu * 0.7 + rank.google * 0.2 + rank.bing * 0.1) : 0;

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


let lastEntry: entry | undefined;
export async function getPopularEntry(liberRandArg?: number | liberType): Promise<entry>
{
    if (lastEntry === undefined)
        [lastEntry] = await getRandomliber();

    const item = await getRankestEntryInSeveralTimes(5, liberRandArg);
    if (item.rank > lastEntry.rank)
    {
        lastEntry = item;
        return item;
    }

    // 开始衰减
    let x = 1;
    let k = 1 / 20;

    while (k * x < 1)
    {
        let r = lastEntry.rank * (1 - k * x);
        let [entry, entryList] = await getRandomliber();
        if (entry.rank > r)
        {
            lastEntry = entry;
            return entry;
        }
        else
        {
            entryList.forEach(x =>
            {
                if (x.rank > r)
                {
                    lastEntry = x;
                    return x;
                }
            });
        }
        ++x;
    }

    [lastEntry] = await getRandomliber();
    return lastEntry;
}