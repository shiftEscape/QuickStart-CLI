#!/usr/bin/env node
var program = require('commander');
var mkdirp = require('mkdirp');
var fs  = require('fs');
var fse = require('fs-extra');

function fsExistsSync(myDir) {
	try {
		fs.accessSync(myDir);
		return true;
	} catch (e) {
		return false;
	}
}

program
	.version('0.0.1')
	.option('-c, --create <project name>', 'The project name to be created')
	.parse(process.argv);

var projectName = program.create;

if (projectName) {
	if(!fsExistsSync(projectName)) {
		mkdirp(projectName, function (err) {
			if (err) { console.error(err); }
			else {
				var path = __dirname + '/files/';
				fse.copy(path, projectName, function (err) {
					console.log('done');
				});
			}
		});
	} else {
		console.log('Directory `' + projectName + '` already exists. Please try a new one');
	}
}
