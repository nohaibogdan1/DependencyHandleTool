const path = require('path');
const fsPromises = require('fs').promises;
const dependencyTree = require('../dependency-tree');

const PROJECT_ABSOLUTE_PATH = '';
const NEW_PROJECT_ABSOLUTE_PATH = '';
const DEPENDENCIES_FILE = 'find-imports/json-files/dependencies.json';

async function saveToFile(tree) {
    try {
        await fsPromises.rm(DEPENDENCIES_FILE);
    } catch(_){}

    await fsPromises.appendFile(DEPENDENCIES_FILE, '[');

    for (const t of tree) {
        await fsPromises.appendFile(DEPENDENCIES_FILE, '"' + t + '"' + ',\n');
    }
    await fsPromises.appendFile(DEPENDENCIES_FILE, ']');
}

async function copyDependencies (dependencies) {
    console.log(`Total of ${dependencies.length} will be copied`);
    let num = 1;
    for (const dependency of dependencies) {
        console.log(`file${num++}`);
        try {
            await fsPromises.copyFile(
                dependency, 
                path.join(
                    NEW_PROJECT_ABSOLUTE_PATH, 
                    dependency.split(PROJECT_ABSOLUTE_PATH)[1])
                );
        } catch(e) {
        }
    }
}

function main(filePath) {
    /** tree is composed from filePath which is the root and 
     *  rest of the nodes represents dependencies of filePath, 
     *  dependencies of dependencies, etc..
     */
    const tree = dependencyTree({
        filename: filePath,
        directory: PROJECT_ABSOLUTE_PATH,
        filter: path => path.indexOf('node_modules') === -1 && path.indexOf('gatsby') === -1,
        isListForm: true,
    });

    /** eliminate directories from tree directory filepaths */
    const newTree = tree.filter(path => path.includes('.'));
    // saveToFile(newTree); /** save to external file for debug */
    copyDependencies(newTree);
}

module.exports = {
    main
};

