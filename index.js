#!/usr/bin/env node

var _       = require('lodash');
var fs      = require('fs');
var fse     = require('fs-extra');
var path    = require('path');
var chalk   = require('chalk');
var mkdirp  = require('mkdirp');
var program = require('commander');

/* Spinner declarations */
var ora         = require('ora');
var cliSpinners = require('cli-spinners');
var spinner     = ora(cliSpinners.dots);

/* Process (NODE) declarations */
var childProcess = require('child_process');
var exec         = childProcess.exec;
var execFile     = childProcess.execFile;

/* Variable declarations */
var projectName, generateName, replaceRegex, frmSrc, newSrc,
		replaceLocation, listModules, newImports, _list, createDir,
		labelToChange, _regexWords, _regexLine;

/* Blueprint contents */
var featureMap = {
	'component': {
		'index.ts': "export * from './{!SELECTOR}.component';",
		'{!SELECTOR}.component.ts': "import { Component, OnInit } from '@angular/core';\r\n\r\n@Component({\r\n\tmoduleId: module.id,\r\n\tselector: 'app-{!SELECTOR}',\r\n\ttemplate: `{!SELECTOR} works!`,\r\n\tstyles: [ ]\r\n})\r\nexport class {!CLASSNAME}Component implements OnInit {\r\n\r\n\tconstructor() { }\r\n\r\n\tngOnInit() { }\r\n\r\n}",
		'{!SELECTOR}.component.html': "<p>\r\n\t{!SELECTOR} works!\r\n</p>",
		'{!SELECTOR}.component.css': "/* {!SELECTOR} stylesheet */"
	},
	'directive': "import { Directive } from '@angular/core';\r\n\r\n@Directive({\r\n\tselector: '[{!SELECTOR}]'\r\n})\r\nexport class {!CLASSNAME}Directive {\r\n\r\n\tconstructor() { }\r\n\r\n}",
	'service': "import { Injectable } from '@angular/core';\r\n\r\n@Injectable()\r\nexport class {!CLASSNAME}Service {\r\n\r\n\tconstructor() { }\r\n\r\n}",
	'pipe': "import { Pipe, PipeTransform } from '@angular/core';\r\n\r\n@Pipe({\r\n\tname: '{!PIPENAME}'\r\n})\r\nexport class {!CLASSNAME}Pipe implements PipeTransform {\r\n\r\n\ttransform(value: any, args?: any): any {\r\n\t\treturn null;\r\n\t}\r\n\r\n}",
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

	/**
	 * Logs info (green)
	 * @param info <string> Text to be displayed
	 */
	logInfo: function (info) {
		console.log(chalk.green(info));
	},

	/**
	 * Logs error (red)
	 * @param error <string> Text to be displayed
	 */
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
					console.log('   ' + chalk.green('Created') + ' ' + file_list[i]);
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
		createDir = process.cwd() + '/{!DIRUP}' + args.selector + '.' + args.feature + '.ts';
		if (args.feature === 'component') {
			createDir = createDir.replace(/\{\!DIRUP\}/, args.selector+'/')
			classCLI.createComponentFiles(args);
		} else {
			createDir = createDir.replace(/\{\!DIRUP\}/, '')
			var replaceSelector = featureMap[args.feature].replace(/\{\!SELECTOR\}/g, args.selector);
			var replacePipe     = replaceSelector.replace(/\{\!PIPENAME\}/g, args.pipeName);
			var dataToWrite     = replacePipe.replace(/\{\!CLASSNAME\}/g, args.className);
			classCLI.writeToFile(args.selector+'.'+args.feature+'.ts', dataToWrite);
		} classCLI.insertFeatureToModule(args, createDir);
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

	/**
	 * Parses and replaces target line for feature created
	 * @param featureName <string> Formatted feature name
	 * @param type <string> Raw feature type created
	 * @param data <string> app.module source code
	 */
	parseModulesList: function (featureName, type, data) {
		labelToChange = (type === 'service' ? 'providers' : 'declarations');
		_regexLine = new RegExp("("+labelToChange+":[^]+?\]\,)", "i");
		_regexWords = new RegExp("\(\(?!"+labelToChange+"\\b\)\\b\\w+\)", "ig");
		replaceLocation = data.match(_regexLine);
		_list = replaceLocation[0].match(_regexWords);
		_list = _list === null ? [] : _list;
		_list.push(featureName);
		_list = _.uniq(_list, false);
		return data.replace(_regexLine, labelToChange + ":    [ " + _list.join(", ") + " ],");
	},

	/**
	 * Parses and replaces target line for imports section of module
	 * @param featureName <string> Formatted feature name
	 * @param fromSrc <string> Requesting target __dirname
	 * @param data <string> app.module source code
	 */
	parseRequiresList: function (featureName, fromSrc, data) {
		var requireStr = data.match(/(import \{[^\n]+?\;)/g);
		var moduleStr  = requireStr.join("").match(/(\{[^\n]+?\})/g);
		var modValues  = moduleStr.join("").match(/(\b\w+)/g);
		if (_.indexOf(modValues, featureName) < 0) {
			return data.replace(/(@NgModule\(\{)/, 'import { ' + featureName + ' } from \''+fromSrc+'\';\r\n@NgModule\(\{');
		}
	},

	formatSource: function (path) {
		path = path.replace(/\.ts$/, '');
		return path.charAt(0) !== '.' ? './'+path : path;
	},

	/**
	 * Rewrites <app.module.ts> to insert the newly created feature
	 * @param featureName <string> Feature name to be created
	 */
	insertFeatureToModule: function (args, createDir) {
		var featureName = args.className + args.feature.uCaseFirst();
		classCLI.searchModuleFile( function (source) {
			if (source === null) {
				classCLI.logError('Application module not found!');
				return false;
			} else {
				newSrc = path.resolve(source).replace(/\/app\.module\.ts/, '');
				frmSrc = path.relative(newSrc, createDir);
				fs.readFile(source, 'utf8', function (err, data) {
					modRewrite = classCLI.parseModulesList(featureName, args.feature, data);
					reqRewrite = classCLI.parseRequiresList(featureName, classCLI.formatSource(frmSrc), modRewrite);
					classCLI.writeToFile(source, reqRewrite);
				});
			}
		});
	}

};

/**
 * Parse user input | Using NPM Commander
 * https://www.npmjs.com/package/commander
 */
program
	.option('-n, --new <project name>', 'Create a new project')
	.option('-g, --generate <component|service|directive|pipe> <name>', 'Generates @angular2 feature')
	.parse(process.argv);

/* Fetch | Assign input from user */
projectName = program.new; generateName = program.generate;

/* Fail fast: Display error on invalid blueprints */
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
		classCLI.logError('Directory `' + projectName + '` already exists. Please try a new one! :)');
	}

} else if (generateName && program.args.length > 0) {

	var argValue = program.args[0];

	classCLI.generateBlueprints({
		feature:   generateName.toLowerCase(),
		selector:  argValue.toHyphen(),
		pipeName:  argValue.toCamelCase(),
		className: argValue.toCamelCase().uCaseFirst()
	});

}
