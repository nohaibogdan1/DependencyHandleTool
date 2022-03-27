# Technical Documentation

## How to get the files affected by a module
Go to get-file-dependencies.js file and set PROJECT_ABSOLUTE_PATH.

Use command: 
```bash
node index.js find-file-usability absolute_file_path
```

Check the file ```find-file-usability/json-files/usabilityChains.json```

<br/>


## How to get dependencies tree for a module
The purpose for this tool is to copy a module and all its dependencies from a project into a project clone. 

Go to find-imports.js file and set:
```
 - PROJECT_ABSOLUTE_PATH
 - NEW_PROJECT_ABSOLUTE_PATH
```

Use command:
```bash
node index.js find-imports absolute_file_path
```

 
<br/>

## To remove files from a folder structure

Use command:
```bash
node index.js cleanup absolute_folder_path
```

<br/>

## How find-imports can be used

In order to a project that runs faster it needs to be smaller. 

1. Clone the existent project. 
2. For the new project run ```cleanup``` command to remove files from folders.
3. Run ```find-imports``` command to copy the module that you are working on with its dependency tree.
4. Now you got a simpler version of the project that contains only files that you are working on.

## Important
Files required by ```uri``` in css are not copied
<br/>
Tests files are not copied

