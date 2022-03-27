const path = require('path');
const fsPromises = require('fs').promises;
const cleanup = require('./cleanup/index');
const findImports = require('./find-imports/index');
const findFileUsability = require('./find-file-usability/index');

const commands = {
    'cleanup': cleanup.main,
    'find-imports': findImports.main,
    'find-file-usability': findFileUsability.main,
};

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || !Object.keys(commands).includes(args[0])) {
        console.log('A valid command was not given');
        console.log('Valid commands: cleanup, find-imports, find-file-usability');
        return;
    }

    if (!args[1]) {
        console.log('A path was not given');
        return;   
    }

    const [command, filepath] = args;

    if (!path.isAbsolute(filepath)) {
        console.log(`The given path is not absolute path`);
        return;
    }

    try {
        await fsPromises.access(filepath);
    } catch (_) {
        console.log(`The given path doesn't exist`);
        return;
    }

    commands[command](filepath);
}

main();
