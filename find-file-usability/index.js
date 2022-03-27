const fs = require('fs');
const fsPromises = fs.promises;
const { getFilesWithDependencies } = require('./get-file-dependencies')

const PAGES_DEPENDENCY_FILE = 'find-file-usability/json-files/pagesDependencies.json';
const DEPENDENT_OBJ_FILE = 'find-file-usability/json-files/dependentObj.json';
const USABILITY_CHAINS_FILE = 'find-file-usability/json-files/usabilityChains.json';

/** 
 * constructs an object in which each key is a filepath and
 * the its property is a list of paths that are dependent
 * (are importing the filepath)
 */
function lookup(str, obj) {
    const depObj = {};

    const stack = [str];

    while(stack.length) {
        const dependentFiles = [];
        const tempStr = stack.pop();
        if (Object.keys(depObj).includes(tempStr)){
            continue;
        }
        for (const key of Object.keys(obj)) {
            if (obj[key].includes(tempStr)){
                dependentFiles.push(key);
                stack.push(key);
            }
        }
        depObj[tempStr] = dependentFiles;
    }

    return depObj;
}

/** 
 *  uses depth first search to get chain of dependent paths 
 *  a chain of dependent paths is containing:
 *    - the root node, a file path where it is used, etc.. until
 *      a file path which is not imported anywhere (e.g. page file)
 *    - it shows what files are touched by the node 
 */
function getUsabilityChains (node, obj) {
    const vertices = [];
    const adjacent = {};
    
    /** fill the vertices list and adjacent object */
    for (const key of Object.keys(obj)) {
        vertices.push(key);
        adjacent[key] = [...obj[key]];
    }

    /** create a Stack and add our initial node in it */
    const chains = [];
    const stack = [];
    const explored = new Set();
    stack.push(node);
 
    /** mark the first node as explored */
    explored.add(node);
 
    /** we'll continue till our Stack gets empty */
    while (stack.length) {
        /** get the first node */
        let t = stack[stack.length - 1];
        explored.add(t);
 
        /** get adjiacent nodes that are not explored and take the first one */
        const unexplored = adjacent[t]
            .filter(n => !explored.has(n))[0];
        /** 
         * if there is an unexplored node add it to stack 
         * else it means that current stack contains
         * a chain of elements (chain from root to end node) or a partial one (when
         * it goes back towards the root and removes nodes from stack)
        */
        if (unexplored) {
            stack.push(unexplored);
        } else {
            /** make it string to be easer to compare */
            const possibleChain = [...stack].join(',');
            /** checks if it is partial chain (the partial chain is included in a full chain) */
            if (chains.every(chain => chain.indexOf(possibleChain) === -1)) {
                chains.push(possibleChain);
            }
            /** remove the node from stack */
            stack.pop();
        }
    }

    /** make the chains from strings back to lists */
    return chains.map(chain => chain.split(','));
}

/**
 * constructs usability chains for a file path
 * an usability chain is containing:
 *    - the root node, a file path where it is used, etc.. until
 *      a file path which is not imported anywhere (e.g. page file)
 *    - it shows what files are touched by the node 
 */
async function findFileUsability(file) {
    const depString = await fsPromises.readFile(PAGES_DEPENDENCY_FILE);
    const dep = JSON.parse(depString);
    const depedentObj = lookup(file, dep);

    try {
        await fsPromises.rm(DEPENDENT_OBJ_FILE);
    } catch(_) {}
    await fsPromises.writeFile(DEPENDENT_OBJ_FILE, JSON.stringify(depedentObj, null, 2));

    const usabilityChains = getUsabilityChains(file, depedentObj);

    try {
        await fsPromises.rm(USABILITY_CHAINS_FILE);
    } catch(_) {}
    await fsPromises.writeFile(USABILITY_CHAINS_FILE, JSON.stringify(usabilityChains, null, 2));
}

async function main(filepath) {
    console.log(`Check for existent ${PAGES_DEPENDENCY_FILE} file`);

    let pagesDependenciesFileExists = false;
    
    try {
        await fsPromises.access(PAGES_DEPENDENCY_FILE, fs.F_OK);
        pagesDependenciesFileExists = true;
    } catch(_){}

    if (!pagesDependenciesFileExists) {
        console.log(`${PAGES_DEPENDENCY_FILE} file doesn't exist.. will create one`);
        await getFilesWithDependencies();
    }

    await findFileUsability(filepath);

    console.log(`usability chains are found in ${PAGES_DEPENDENCY_FILE} file`);
}

module.exports = {
    findFileUsability,
    getUsabilityChains,
    lookup,
    main
};
