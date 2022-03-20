const fs = require('fs');
const path = require('path');
const dependencyTree = require('./dependency-tree');

const PROJECT_PARENT_FOLDER_NAME = 'optum-frontend-three';
const PROJECT_SIMPLE_PARENT_FOLDER_NAME = 'optum-frontend-four';

function getDependencies() {
    const raw = fs.readFileSync('dependencies.json');
    const dependencies = JSON.parse(raw);
    return dependencies;
}

function copyDependency(path1, path2) {
    fs.copyFileSync(path1, path2);
}

function emptyFoldersRecursively(filepath) {
    const isDir = fs.statSync(filepath).isDirectory();
    if (isDir) {
        const files = fs.readdirSync(filepath);
        for (const f of files) {
            var fullPath = path.join(filepath, f);
            emptyFoldersRecursively(fullPath);
        }

    } else {
        fs.rmSync(filepath);
    }
}

function removeStuff() {
    const folder = 'put here folder path';

    ['templates', 
    'services',
    'pages',
    'page-components', 
    'components',
    'core',
    'utils'].forEach(
        elem => emptyFoldersRecursively(`${folder}${elem}`));
}

function replaceString(str, str1, str2) {
    const newString = str.split(str1).join(str2);
    return newString;
}

function saveToFile(tree) {
    fs.appendFileSync('dependency.json', '[');

    for (const t of tree) {
        fs.appendFileSync('dependency.json', '"' + t + '"' + ',\n');
    }
    fs.appendFileSync('dependency.json', ']');
}

function copyDependencyToSimpleProject(d) {
    copyDependency(
        d,  
        replaceString(d, PROJECT_PARENT_FOLDER_NAME, PROJECT_SIMPLE_PARENT_FOLDER_NAME)
    );
}

function copyDependencies (dep) {
    let dependencies = [];

    if (!dep) {
        dependencies = objToArray(getDependencies());
    } else {
        dependencies = [...dep];
    }
    let len = dependencies.length;

    for (const d of dependencies) {
        console.log(len--);
        try {
            copyDependencyToSimpleProject(d);
        } catch(e) {
            // console.log('e', e);
        }
    }
}

function findImports () {
    // const nonExistent = [];
    var tree = dependencyTree({
        filename: 'file wanted',
        directory: '',
        filter: path => path.indexOf('node_modules') === -1 && path.indexOf('gatsby') === -1, // optional,
        // nonExistent: nonExistent,
        isListForm: true, // tree will be an array of filepaths
    });

    saveToFile(tree);

    // copyDependencies(tree);
}

// removeStuff();

// findImports();

module.exports = {
    findImports
};

