#!/usr/bin/env node
var program = require('commander');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var fs  = require('fs');
var fse = require('fs-extra');

var ora = require('ora');
var cliSpinners = require('cli-spinners');
var spinner = ora(cliSpinners.dots);

var childProcess = require('child_process');
var exec = childProcess.exec;
var execFile = childProcess.execFile;

var projectName, generateName;

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
	 * Install packages for tooling via NPM
	 * @param projectName <string> New project name | location to be created
	 */
	installModules: function (projectName) {
		exec("cd " + projectName + " && npm i", function (error, stdout, stderr) {
			if (stderr) {
				console.log(chalk.red('Errors: ') + stderr);
			} else if (error !== null) {
				console.log(chalk.red('Execution errors: ') + error);
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
				console.log(chalk.red('   Error in creating '+filename));
			else
				console.log(chalk.green('   Created') + ' ' + filename);
		})
	},

	/**
	 * Created directory|files needed for component creation
	 * @param args <object> List of component needed constants
	 */
	createComponentFiles: function (args) {
		var cwd = process.cwd(), selectorName = args.selector;
		var componentFiles = featureMap[args.feature];

		mkdirp(selectorName, function (err) {
			if (err) { console.log(chalk.red(err)); }
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
		if (args.feature in featureMap) {
			if (args.feature === 'component') {
				classCLI.createComponentFiles(args);
			} else {
				var replaceSelector = featureMap[args.feature].replace(/\{\!SELECTOR\}/g, args.selector);
				var replacePipe = replaceSelector.replace(/\{\!PIPENAME\}/g, args.pipeName);
				var dataToWrite = replacePipe.replace(/\{\!CLASSNAME\}/g, args.className);
				classCLI.writeToFile(args.selector+'.'+args.feature+'.ts', dataToWrite);
			}
		} else {
			console.log(chalk.red('Invalid blueprint: `' + args.feature + '`'));
		}
	}

};

/**
 * Parse user input | Using NPM Commander
 * https://www.npmjs.com/package/commander
 */
program
	.option('-n, --new <project name>', 'Create a new project')
	.option('-g, --generate <component|service|directive|pipe> <name>', 'Generates corresponding blueprint files')
	.parse(process.argv);

/* Fetch | Assign input from user */
projectName = program.new; generateName = program.generate;

if (projectName) {
	if(!classCLI.fsExistsSync(projectName)) {
		mkdirp(projectName, function (err) {
			if (err) { console.log(chalk.red(err)); }
			else {
				var path = __dirname + '/files/';
				classCLI.startProcess(path, projectName);
			}
		});
	} else {
		console.log(chalk.red('Directory `' + projectName + '` already exists. Please try a new one'));
	}
} else if (generateName) {
	classCLI.generateBlueprints({
		feature: generateName.toLowerCase(),
		selector:  program.args[0].toHyphen(),
		pipeName: program.args[0].toCamelCase(),
		className: program.args[0].toCamelCase().uCaseFirst()
	});
}
