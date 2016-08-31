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

function fsExistsSync(myDir) {
	try {
		fs.accessSync(myDir);
		return true;
	} catch (e) {
		return false;
	}
}

function runLoading (text) {
	spinner.start();
	spinner.color = 'green'
	spinner.text = chalk.green(text);
}

function installMods (projectName) {
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
}

function startProcess(path, projectName) {
	fse.copy(path, projectName, function (err) {
		execFile('find', [ projectName ], function(err, stdout, stderr) {
			var file_list = stdout.split('\n');
			file_list.splice(-1, 1);
			for (var i in file_list) {
				console.log(chalk.green('created') + ' ' + file_list[i]);
			} console.log('\n');
			runLoading('Installing packages for tooling via NPM..');
			installMods(projectName);
		});
	});
}

program
	.option('-n, --new <project name>', 'The project name to be created')
	.parse(process.argv);

var projectName = program.new;

if (projectName) {
	if(!fsExistsSync(projectName)) {
		mkdirp(projectName, function (err) {
			if (err) { console.error(err); }
			else {
				var path = __dirname + '/files/';
				startProcess(path, projectName);
			}
		});
	} else {
		console.log('Directory `' + projectName + '` already exists. Please try a new one');
	}
}
