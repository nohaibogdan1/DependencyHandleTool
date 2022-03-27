/** cleanup folders */
const fsPromises = require('fs').promises;
const path = require('path');

async function emptyFoldersRecursively(filepath) {
    const filepathInfo = await fsPromises.stat(filepath);
    if (filepathInfo.isDirectory()) {
        const files = await fsPromises.readdir(filepath);
        for (const f of files) {
            var fullPath = path.join(filepath, f);
            emptyFoldersRecursively(fullPath);
        }

    } else {
        await fsPromises.rm(filepath);
    }
}

async function main(folderPath) {
    /** each folder should be absolute path */
    emptyFoldersRecursively(folderPath);
}

module.exports = {
    main
};
