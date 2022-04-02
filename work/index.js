const fsPromises = require('fs').promises;
const precinct = require('precinct');
const detectiveTypeScript = require('detective-typescript');
const Walker = require('node-source-walk');
const getModuleType = require('module-definition');
const detectiveEs6 = require('detective-es6');
const path = require('path');
const { resolve } = require('path');
const Parser = require('@typescript-eslint/typescript-estree');


function comparePathNames(path1, path2) {
    return path.parse(path1.split('index')[0]).name === path.parse(path2.split('index')[0]).name;
}

async function getExportsFromDependence(dependenceFile) {
    const content = await (await fsPromises.readFile(dependenceFile)).toString();
    const walker = new Walker({ parser: Parser, jsx: true  });

    const data = [];

    walker.walk(content, (node) => {
        if (node.type === 'ExportDefaultDeclaration') {
            /** export default X */
            data.push({
                type: 'export',
                name: node.declaration.name,
                default: true,
            });
            walker.shouldStop = true;
            return;
        }

        if (node.type === 'ExportNamedDeclaration') {
            const { declaration, specifiers } = node;
            if (specifiers && specifiers.length) {
                specifiers.forEach(s => {
                    const { local, exported } = s;
                    data.push({
                        type: 'export',
                        name: exported.name,
                        local: local.name,
                        exported: exported.name,
                    });
                });
            }

            if (declaration && declaration.declarations) {
                /** export const X */
                const { declarations } = declaration;
                if (declarations[0].type === 'VariableDeclarator') {
                    const { id } = declarations[0];
                    if (id) {
                        const { name } = id;
                        if (name[0].toUpperCase() === name[0]) {
                            data.push({
                                type: 'export',
                                name
                            });
                        }
                    }
                }
            }
        }
    });

    return data;
}

async function getImportsFromDependent({ dependentFile, dependenceFile }) {
    const content = await (await fsPromises.readFile(dependentFile)).toString();
    const walker = new Walker({ parser: Parser, jsx: true  });
   
    const data = [];
    
    walker.walk(content, (node) => {
        if (node.type === 'ImportDeclaration') {
            const { specifiers, source } = node;
            if (comparePathNames(dependenceFile, source.value)) {
                walker.shouldStop = true;
                if (specifiers && specifiers.length) {
                    const specifier = specifiers[0];
                    if (specifier.type === 'ImportDefaultSpecifier') {
                        data.push({
                            type: 'import',
                            name: 'default',
                        });
                        return;
                    } 
                    if (specifier.type === 'ImportSpecifier') {
                        specifiers.forEach((s) => {
                            const { imported } = s;
                            data.push({
                                type: 'import',
                                name: imported.name
                            });
                        });
                        return;
                    }
                }
            }
        }
    });

    return data;
}

async function getImportsExports({dependentFile, dependenceFile}) {
    const content = await (await fsPromises.readFile(dependentFile)).toString();
    const walker = new Walker({ parser: Parser, jsx: true  });
   
    const data = [];

    walker.walk(content, (node) => {
        if (node.type === 'ExportAllDeclaration') {
            const { source } = node;
            if (source) {
                /** export * from ... */
                if (comparePathNames(dependenceFile, source.value)) {
                    walker.shouldStop = true;
                    data.push({
                        type: 'import-export',
                        ['import-name']: 'default',
                        ['export-name']: 'default',
                        ['node-type']: node.type
                    });
                    return;
                }
            }
        }
        if (node.type === 'ExportNamedDeclaration') {
            const { declaration } = node;
            if (!declaration) {
                /** export { default as X } from ...  */
                /** export * as X from ... */
                const { specifiers, source } = node;
                if (source) {
                    if (comparePathNames(dependenceFile, source.value)) {
                        // console.log('yes', node);
                        walker.shouldStop = true;

                        if (specifiers) {
                            specifiers.forEach((s) => {
                                const { local, exported } = s;

                                data.push({
                                    type: 'import-export',
                                    ['import-name']: local.name,
                                    ['export-name']: exported.name,
                                    ['node-type']: node.type
                                })
                            })
                            return;
                        }
                    }
                }
            }
        }
    })

    return data;
}

async function findReactComponent(file, names) {

    console.log('names', names)

    const bodyHasJSX = (body) => 
        body.body.filter(n => n.type === 'ReturnStatement' && n.argument?.type === 'JSXElement').length;

    const content = await (await fsPromises.readFile(file)).toString();
    const walker = new Walker({ parser: Parser, jsx: true  });

    let data;

    walker.walk(content, (node) => {

        if (node.type === 'FunctionDeclaration') {
            const { id, body } = node;
            if (names.includes(id.name)) {
                if (bodyHasJSX(body)) {
                    data = id.name;
                    walker.shouldStop = true;
                    return;
                };
            }
        }
        if (node.type === 'ArrowFunctionExpression') {
            /** the parent has the name */
            const { body, parent } = node;

            if (!parent.id) {
                return;
                // if (parent.body.type === 'JSXElement') {
                //     return;
                // }
            }
            const functionName = parent.id.name;
            console.log(functionName);
            if (names.includes(functionName)) {
                console.log("DJFEIOJ")

                /** check if it is react component */
                /** check body */
                if (bodyHasJSX(body)) {
                    data = functionName;
                    walker.shouldStop = true;
                    return;
                };
            }
        }
        if (node.type === 'ExportDefaultDeclaration') {
        // console.log('node', node)

            // const variableDeclarationNodes = node.parent.filter(p => p.type === 'VariableDeclaration');
            // variableDeclarationNodes.forEach(p => {
            //     console.log(p.declarations.filter(el => el.init.type === 'ArrowFunctionExpression'))
            // })
            
        }
    });

    return data;
}

async function main() {
    const objString = await fsPromises.readFile('work/dependentObj.json');
    const obj = JSON.parse(objString);

    // console.log('obj', obj);
    const dependentObjFiltered = {};
    const components = [];
    // console.log(Object.keys(obj))
    const intermediarFilesWithData = {};

    const canBeVisited = [Object.keys(obj)[0]];

    for (const dependenceFile of Object.keys(obj)) {
        console.log('dependenceFile', dependenceFile)
        if (!canBeVisited.includes(dependenceFile)) {
            continue;
        }

        let exported = [];
        const exportedData = await getExportsFromDependence(dependenceFile);
        if (exportedData.length) {
            /** get only the name of the react component exported */
            const name = await findReactComponent(dependenceFile, exportedData.map(el => el.local || el.name));
            exported.push(...exportedData.filter(el => el.name === name));
        } 
        
        if (!exported.length && intermediarFilesWithData[dependenceFile]) {
            exported.push({
                name: intermediarFilesWithData[dependenceFile]['export-name'],
                type: 'export',
            });
        }

        const dependentFilesFiltered = [];
        for (const dependentFile of obj[dependenceFile]) {
            console.log('dependentFile', dependentFile)

            const imported = await getImportsFromDependent({dependentFile, dependenceFile});
            const importedExported = await getImportsExports({dependenceFile, dependentFile});

            if (!imported.length && !importedExported.length) {
                continue;
            }

            let impExp = {};

            if (importedExported.length) {
                impExp = {...impExp, ...importedExported[0]};
                if (impExp['node-type'] === 'ExportAllDeclaration') {
                    /** it means that it exports what its dependence exports */
                    impExp['import-name'] = exported[0] && exported[0].name;
                    impExp['export-name'] = exported[0] && exported[0].name;
                } else {
                    /** is a list of objects imported */
                    /** import {a,b,c} from...  */
                    const filtered = importedExported.filter(el => el['import-name'] === exported[0].name)[0];
                    if (filtered) {
                        /** possible that the component from the list is renamed with alias */
                        impExp['import-name'] = filtered['import-name'];
                        impExp['export-name'] = filtered['export-name'];
                        impExp.type = filtered.type;
                    }
                }
                intermediarFilesWithData[dependentFile] = { ...impExp };
            }

            let imp = {};
            if (imported.length) {
                const filtered = imported.filter(el => el.name === exported[0].name)[0];
                if (filtered) {
                    imp.name = filtered.name;
                    imp.type = filtered.type;
                }
            }

            const expo = exported[0];

            console.log('imp', imp);
            console.log('expo', expo);
            console.log('impExp', impExp);

            if (imp.name === 'default' || imp.name === expo.name ||
                impExp['import-name'] === 'default' || impExp['import-name'] === expo.name
            )  {
               /** good */
               dependentFilesFiltered.push(dependentFile);
               continue;
            } 
        }
        canBeVisited.push(...dependentFilesFiltered);
        dependentObjFiltered[dependenceFile] = [...dependentFilesFiltered];
    }

    console.log('here', dependentObjFiltered);
}

main();


async function a() {
    const f = '';

    const { ext } =  path.parse(f);
    
    if (ext === 'tsx') {

    }

    const content = await (await fsPromises.readFile(f, 'utf8'));
    // console.log(content)
    const walkerOptions = { parser: Parser, jsx: true  };
    
    const walker = new Walker(walkerOptions);

    try {
        walker.walk(content, (node) => {
            // console.log('node', node)
        });
    } catch(e) {
        console.log('e', e)
    }


    // ast = walker.parse(content);


    // const a = precinct.paperwork(f);


//    console.log('a', a);
}

// a();


