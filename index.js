#!/usr/bin/env node

var help = require('./lib/help');
var test = require('./lib/test');
var map = require('./lib/map');
var convert = require('./lib/convert');
var settings = require('./package.json');
var util = require('./lib/util');

var argv = require('minimist')(process.argv, {
    boolean: ["help", "version"],
    alias: { "version": "v" }
});

if (argv.help) {
    help(argv);
    process.exit(0);
} else if (argv.version) {
    console.log(settings.name + '@' + settings.version);
    process.exit(0);
}

switch (argv._[2]) {
    case ("help"):
        help(argv);
        break;
    case ("util"):
        util(process.argv, function(err, res) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            } else {
                console.log(res);
                process.exit(0);
            }
        });
        break;
    case ("map"):
        map(process.argv, function(err) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            }
        });
        break;
    case ("test"):
        test(process.argv, function(err) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            }
        });
        break;
    case ("convert"):
        convert(process.argv, function(err) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            }
        });
        break;
    default:
        help(argv);
        break;
}
