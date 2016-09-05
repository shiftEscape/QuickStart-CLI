#!/usr/bin/env node
var _       = require('lodash');
var fs      = require('fs');
var fse     = require('fs-extra');
var chalk   = require('chalk');
var mkdirp  = require('mkdirp');
var program = require('commander');
var path    = require('path');

var ora = require('ora');
var cliSpinners = require('cli-spinners');
var spinner = ora(cliSpinners.dots);

var childProcess = require('child_process');
var exec = childProcess.exec;
var execFile = childProcess.execFile;

var projectName, generateName, replaceRegex, frmSrc, newSrc,
		replaceLocation, listModules, newImports, _list, createDir,
		replaceRegex = /(declarations:[^]+?\]\,)/i;

/* Blueprint contents */
var featureMap = {
	'component': {
		'index.ts': "export * from './{!SELECTOR}.component';",
		'{!SELECTOR}.component.ts': "import { Component, OnInit } from '@angular/core';\r\n@Component({\r\n   selector: 'app-{!SELECTOR}',\r\n   templateUrl: '{!SELECTOR}.component.html',\r\n   styleUrls: ['{!SELECTOR}.component.css']\r\n})\r\nexport class {!CLASSNAME}Component implements OnInit {\r\n\r\n   constructor() { }\r\n\r\n   ngOnInit() { }\r\n\r\n}",
		'{!SELECTOR}.component.html': "<p>\r\n   {!SELECTOR} works!\r\n</p>",
		'{!SELECTOR}.component.css': "/* {!SELECTOR} stylesheet */"
	},
	'directive': "import { Directive } from '@angular/core';\r\n\r\n@Directive({\r\n   selector: '[{!SELECTOR}]'\r\n})\r\nexport class {!CLASSNAME} {\r\n\r\n   constructor() { }\r\n\r\n}",
	'service': "import { Injectable } from '@angular/core';\r\n\r\n@Injectable()\r\nexport class {!CLASSNAME}Service {\r\n\r\n   constructor() { }\r\n\r\n}",
	'pipe': "import { Pipe, PipeTransform } from '@angular/core';\r\n\r\n@Pipe({\r\n\tname: '{!PIPENAME}'\r\n})\r\nexport class {!CLASSNAME}Pipe implements PipeTransform {\r\n\r\n\ttransform(value: any, args?: any): any {\r\n\t\treturn null;\r\n}\r\n\r\n}",
};

/* Application module source map */
var sourceMap = [
	'./app/app.module.ts',
	'./app.module.ts',
	'../app.module.ts',
	'../../app.module.ts',
	'../../../app.module.ts',
	'../app/app.module.ts',
	'../../app/app.module.ts',
	'../../../app/app.module.ts'
];

/* String prototype methods */
String.prototype.toCamelCase = function() {
	var cleanUp = this.toLowerCase().replace(/\-|\./g, ' ');
	return cleanUp.replace(/^([A-Z])|\s(\w)/g, function(match, p1, p2, offset) {
		if (p2) return p2.toUpperCase();
		return p1.toLowerCase();
	});
};

String.prototype.toHyphen = function() {
	return this.replace(/\s\s+/g, '-').toLowerCase();
};

String.prototype.uCaseFirst = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * Handles methods for CLI actions
 */
var classCLI = {

	/**
	 * Checks directory existence
	 * @param myDir <string> Directory location to be checked
	 * @return boolean
	 */
	fsExistsSync: function (myDir) {
		try {
			fs.accessSync(myDir);
			return true;
		} catch (e) {
			return false;
		}
	},

	/**
	 * Runs loading indicator
	 * @param text <string> Text to be displayed during loading
	 */
	runLoading: function (text) {
		spinner.start();
		spinner.color = 'green'
		spinner.text = chalk.green(text);
	},

	logInfo: function (info) {
		console.log(chalk.green(info));
	},

	logError: function (error) {
		console.log(chalk.red(error));
	},

	/**
	 * Install packages for tooling via NPM
	 * @param projectName <string> New project name | location to be created
	 */
	installModules: function (projectName) {
		exec("cd " + projectName + " && npm i", function (error, stdout, stderr) {
			if (stderr) {
				classCLI.logError('Errors: ' + stderr);
			} else if (error !== null) {
				classCLI.logError('Execution errors: ' + error);
			}
			console.log(stdout);
			spinner.succeed();
			console.log(chalk.bold.green('Go to your project directory and use `npm start` to run\n'));
		});
	},

	/**
	 * Install boilerplates required to quickstart Angular2 Project
	 * @param path <string> Path pointing to CLI directory for file references
	 * @param projectName <string> Path name the files to be created
	 */
	startProcess: function (path, projectName) {
		fse.copy(path, projectName, function (err) {
			execFile('find', [ projectName ], function(err, stdout, stderr) {
				var file_list = stdout.split('\n');
				file_list.splice(-1, 1);
				console.log('\n');
				for (var i in file_list) {
					console.log('   '+chalk.green('Created') + ' ' + file_list[i]);
				} console.log('\n');
				classCLI.runLoading('Installing packages for tooling via NPM..');
				classCLI.installModules(projectName);
			});
		});
	},

	/**
	 * Writes generated blueprints to a file
	 * @param filename <string> Filename of file to be created
	 * @param data <string> File contents
	 */
	writeToFile: function (filename, data) {
		fs.writeFile(filename, data, function (err) {
			if (err)
				classCLI.logError('   Error: ' + filename);
			else
				console.log(chalk.green('   Created') + ' ' + filename);
		})
	},

	/**
	 * Created directory|files needed for component creation
	 * @param args <object> List of component needed constants
	 */
	createComponentFiles: function (args) {
		var selectorName = args.selector;
		var componentFiles = featureMap[args.feature];

		mkdirp(selectorName, function (err) {
			if (err) { classCLI.logError(err); }
			else {
				for(var key in componentFiles) {
					var filename = key.replace(/\{\!SELECTOR\}/g, args.selector);
					var toWriteSelector = componentFiles[key].replace(/\{\!SELECTOR\}/g, args.selector);
					var toWriteData = toWriteSelector.replace(/\{\!CLASSNAME\}/g, args.className);
					classCLI.writeToFile(selectorName+'/'+filename, toWriteData);
				}
			}
		});
	},

	/**
	 * Creates needed blueprints requested by user
	 * @param args <object> List of needed constants
	 */
	generateBlueprints: function (args) {
		if (args.feature === 'component') {
			createDir = process.cwd() + '/' + args.selector;
			classCLI.createComponentFiles(args);
		} else {
			createDir = process.cwd() + '/' + args.selector + '.' + args.feature + '.ts';
			var replaceSelector = featureMap[args.feature].replace(/\{\!SELECTOR\}/g, args.selector);
			var replacePipe     = replaceSelector.replace(/\{\!PIPENAME\}/g, args.pipeName);
			var dataToWrite     = replacePipe.replace(/\{\!CLASSNAME\}/g, args.className);
			classCLI.writeToFile(args.selector+'.'+args.feature+'.ts', dataToWrite);
		} classCLI.insertFeatureToModule(args.className + args.feature.uCaseFirst(), createDir);
	},

	/**
	 * Search for <app.module.ts> within the directory
	 * @param cb <method> Callback method to call after success
	 */
	searchModuleFile: function (cb) {
		for(var i in sourceMap) {
			if (classCLI.fsExistsSync(sourceMap[i])) {
				cb(sourceMap[i]); return false;
			}
		} cb(null);
	},

	parseModulesList: function (featureName, data) {
		replaceLocation = data.match(replaceRegex);
		_list = replaceLocation[0].match(/(?!declarations\b)\b\w+/ig);
		_list = _list === null ? [] : _list;
		_list.push(featureName);
		_list = _.uniq(_list, false);
		newImports = "declarations: [ " + _list.join(", ") + " ],";
		return data.replace(replaceRegex, newImports);
	},

	parseRequiresList: function (featureName, fromSrc, data) {
		var requireStr = data.match(/(import \{[^\n]+?\;)/g);
		var moduleStr  = requireStr.join("").match(/(\{[^\n]+?\})/g);
		var modValues  = moduleStr.join("").match(/(\b\w+)/g);
		if (_.indexOf(modValues, featureName) < 0) {
			return data.replace(/(@NgModule\(\{)/, 'import { ' + featureName + ' } from \''+fromSrc+'\';\r\n@NgModule\(\{');
		}
	},

	/**
	 * Rewrites <app.module.ts> to insert the newly created feature
	 * @param featureName <string> Feature name to be created
	 */
	insertFeatureToModule: function (featureName, createDir) {
		classCLI.searchModuleFile( function (source) {
			if (source === null) {
				classCLI.logError('Application module not found!');
				return false;
			} else {
				newSrc = path.resolve(source).replace(/\/app\.module\.ts/, '');
				frmSrc = path.relative(newSrc, createDir);
				fs.readFile(source, 'utf8', function (err, data) {
					modRewrite = classCLI.parseModulesList(featureName, data);
					reqRewrite = classCLI.parseRequiresList(featureName, frmSrc, modRewrite);
					classCLI.writeToFile(source, reqRewrite);
				});
			}
		});
	}

};

// (import \{[^\n]+?\;)

/**
 * Parse user input | Using NPM Commander
 * https://www.npmjs.com/package/commander
 */
program
	.option('-n, --new <project name>', 'Create a new project')
	.option('-g, --generate <component|service|directive|pipe> <name>', 'Generates corresponding blueprint files')
	.option('-t, --test', 'Used for testing')
	.parse(process.argv);

/* Fetch | Assign input from user */
projectName = program.new; generateName = program.generate;

/* Fail fast: Display error in invalid blueprints */
if (!program.new && (program.args.length < 1 || !(program.generate in featureMap))) {

	classCLI.logError('Invalid blueprint: `' + generateName + '`');

} else if (projectName) {

	if(!classCLI.fsExistsSync(projectName)) {
		mkdirp(projectName, function (err) {
			if (err) { classCLI.logError(err); }
			else {
				var path = __dirname + '/files/';
				classCLI.startProcess(path, projectName);
			}
		});
	} else {
		classCLI.logError('Directory `' + projectName + '` already exists. Please try a new one');
	}

} else if (generateName && program.args.length > 0) {

	classCLI.generateBlueprints({
		feature: generateName.toLowerCase(),
		selector:  program.args[0].toHyphen(),
		pipeName: program.args[0].toCamelCase(),
		className: program.args[0].toCamelCase().uCaseFirst()
	});

}
