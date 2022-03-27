const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const dependencyTree = require('../dependency-tree');
const Config = require('../dependency-tree/lib/Config');

const PAGES_DEPENDENCY_FILE = 'find-file-usability/json-files/pagesDependencies.json';
const PROJECT_ABSOLUTE_PATH = '';

async function getFilesIteratively(filepath) {
    const files = [];
    const stack = [filepath];

    while(stack.length) {
        const filepathTemp = stack.pop();
        const filepathStat = await fsPromises.stat(filepathTemp);
        /** if is directory goes deeper else adds the file in the list */
        if (filepathStat.isDirectory()) {
            const children = await fsPromises.readdir(filepathTemp);
            for (const f of children) {
                const fullPath = path.join(filepathTemp, f);
                stack.push(fullPath);
            }
        } else {
            files.push(filepathTemp)
        }
    }

    return files;
}

async function getAllFiles() {
    return await getFilesIteratively(path.join(PROJECT_ABSOLUTE_PATH, 'src'));
}

/** get the absolute paths imported by file */
function findFileDependencies(file) {
    const config = new Config({
        filename: file,  /** absolute path of file for which we get its dependencies */
        directory: PROJECT_ABSOLUTE_PATH,
        filter: path => path.indexOf('node_modules') === -1 && path.indexOf('gatsby') === -1, 
                        /** exclude node_modules and gatsby  */
        isListForm: true, /** tree will be an array of filepaths */
    });

    /** at this moment _getDependencies uses sync functions from fs */
    return dependencyTree._getDependencies(config);
}

async function getFilesWithDependencies() {
    /** get all files starting from a root folder, which is "src" */
    const files = await getAllFiles();
    const dependencies = {};
    
    for (const file of files) {
        dependencies[file] = [];
        findFileDependencies(file)
            .forEach(path => {
                /** if a path doesn't have a "." it means that is a folder and it can 
                 *  have a index file which can have the extension .ts or .tsx
                  */
                if (!path.includes('.')) {
                    dependencies[file].push(`${path}/index.tsx`, `${path}/index.ts`);
                } else {
                    dependencies[file].push(path);
                }
            });
    }

    await fsPromises.writeFile(PAGES_DEPENDENCY_FILE, JSON.stringify(dependencies, null, 2));
}

module.exports = {
    getFilesWithDependencies
};
