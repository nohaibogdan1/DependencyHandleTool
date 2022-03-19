const path = require('path');
const fs = require('fs');

function exist(path) {
    return fs.existsSync(path);
}

function checkWithExtension(path) {
    if (exist(path)) { 
        return path; 
    }
    if (exist(path + '.tsx')) {
        return path + '.tsx';
    }
    if (exist(path + '.scss')) {
        return path + '.scss';
    }
    if (exist(path + '.ts')) {
        return path + '.ts';
    }
}

function getNumberOfDoubleDots(str) {
    const a = str.split('..');
    return a.length - 1;
}

function eliminateDoubleDots(str) {
    const a = str.split('..');
    return path.normalize(a.join(''));
}

function handleDoubleDots({partial, filename, directory}) {
    const n = getNumberOfDoubleDots(partial);
    if (!n) {
        return;
    }
    const workedPartial = eliminateDoubleDots(partial);
    // console.log('workedPartial', workedPartial);
    const list = filename.split('/');
    const parentOfPartial = list.slice(0, list.length - n - 1).join('/');
    // console.log('parentOfPartial', parentOfPartial);
    const resolvedPartial = path.join(parentOfPartial, workedPartial);
    // console.log('resolvedPartial', resolvedPartial);

    return checkWithExtension(resolvedPartial)
}

function handleSingleDot({partial, filename, directory}) {
    return checkWithExtension(path.join(path.dirname(filename), partial));
}

function handlePathWithoutDots({partial, filename, directory}) {
   return checkWithExtension(path.join(directory, partial));
}

function handleSimpleCase({partial, filename, directory}) {
   return checkWithExtension(partial);
}

function pathSolver({
    partial,
    filename,
    directory
}) {
    // console.log('partial\n', partial);
    // console.log('filename\n', filename);    
    // console.log('directory\n', directory);    


    const handlers = [
        handlePathWithoutDots,
        handleSimpleCase,
        handleDoubleDots,
        handleSingleDot,
    ];

    for (const handler of handlers) {
        const data = handler({partial, filename, directory});
        // console.log('d', data);
        if (data) {
            // console.log(data);
            return data;
        }
    }
}

module.exports = pathSolver;
