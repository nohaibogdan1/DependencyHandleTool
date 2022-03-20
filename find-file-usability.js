const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const JsonStreamStringify = require('json-stream-stringify');
const dependencyTree = require('./dependency-tree');
const Config = require('./dependency-tree/lib/Config');


const PROJECT_ABSOLUTE_PATH = '';
const DEPENDENCY_FILE = 'pagesDependencies.json';

/** build dependency tree for each page and each template from gatsby project */
const files = [];

function getFilesRecursively(filepath) {
    const isDir = fs.statSync(filepath).isDirectory();
    if (isDir) {
        const files = fs.readdirSync(filepath);
        for (const f of files) {
            var fullPath = path.join(filepath, f);
            getFilesRecursively(fullPath);
        }
    } else {
        files.push(filepath);
    }
}

function getFiles() {
    ['templates', 'pages']
        .map(f => `${PROJECT_ABSOLUTE_PATH}/src/${f}`)
        .forEach(f => getFilesRecursively(f));
    
    return files;
}

async function saveInFile(obj) {
    return new Promise((resolve, _) => {
        const stringifyStream = new JsonStreamStringify(obj, null, 2);
        const writableStream = fs.createWriteStream(DEPENDENCY_FILE, {flags: 'a'});
        stringifyStream.pipe(writableStream);
        stringifyStream.on('end', () => {
            resolve();
        })
    })
}

async function getDependencies(files) {
    let n = files.length;
    console.log('n', n);
    await fsPromises.appendFile(DEPENDENCY_FILE, '[');

    for (const file of files) {
        console.log('file', file);
        console.log(n--);
        const tree = dependencyTree({
            filename: file,
            directory: PROJECT_ABSOLUTE_PATH,
            filter: path => path.indexOf('node_modules') === -1 && path.indexOf('gatsby') === -1, // optional,
            // nonExistent: nonExistent,
            isListForm: false, // tree will be an array of filepaths
        });

        await saveInFile(tree);
        await fsPromises.appendFile(DEPENDENCY_FILE, ',');
    }
    await fsPromises.appendFile(DEPENDENCY_FILE, ']');
}

async function test() {
    for (let i = 0; i < 10; i++) {
        await saveInFile({a: 1});
        await fsPromises.appendFile(DEPENDENCY_FILE, ',');
    }
}

function getAllFiles() {
    getFilesRecursively(`${PROJECT_ABSOLUTE_PATH}/src`);
    return files;
}

function findFileDependencies(file) {
    const config = new Config({
        filename: file,
        directory: '',
        filter: path => path.indexOf('node_modules') === -1 && path.indexOf('gatsby') === -1, // optional,
        // nonExistent: nonExistent,
        isListForm: true, // tree will be an array of filepaths
    });

    const dependencies = dependencyTree._getDependencies(config);
    return dependencies;
}

function getFilesWithDependencies() {
    const files = getAllFiles();
    const dependencies = {};
    for (const file of files) {
        const dep = findFileDependencies(file);
        dependencies[file] = dep;
    }

    return dependencies;
}

const d = {};
const a = [];

function lookup(str, obj) {
    const stack = [str];

    while(stack.length) {
        const l = [];
        const tempStr = stack.pop();
        if (Object.keys(d).includes(tempStr)){
            continue;
        }
        for (const key of Object.keys(obj)) {
            if (obj[key].includes(tempStr)){
                l.push(key);
                stack.push(key);
            }
        }
        // console.log(l)
        d[tempStr] = l;
    }
}

const o = {
    "e2": ["b"],
    "e1": ["b", "a"],
    "b": ["d", "l"],
    "a": ["d"],
    "d": ["c"],
    "c": ["ab"]
}
// lookupRecursively("ab", o);
// lookup("ab", o);


async function findFileUsability(file) {
    const depString = await fsPromises.readFile(DEPENDENCY_FILE);
    const dep = JSON.parse(depString);
    lookup(file, dep);
    // console.log('d', d);
    // const formatted = formatUsabilityList(file, d);
    // console.log('formatted', formatted);

    fs.writeFileSync('etc.json', JSON.stringify(d, null, 2));
}


// function formatUsabilityList(file, d) {
//     /**
//      * d looks like:
//      * {used_file: [place_file, place_file], ...}
//      */

//     const chains = [];
//     const q = [file];
//     const visited = [];

//     while(stack.length) {
//         const curr = q.shift();
//         const chain = [curr];
//         q.unshift(...d[curr]);

//     }


//     return {
//         filesImportingModule: d[file],
//         chains,
//     };
// }


/** this is used when is wanted to populate the dependencies json file */
// const obj = getFilesWithDependencies();
// fsPromises.writeFile(DEPENDENCY_FILE, JSON.stringify(obj, null, 2));

/** this is used when is wanted to get in what pages a module is used*/
findFileUsability('absolute file path');
