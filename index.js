#!/usr/bin/env node

var help = require('./lib/help');
var map = require('./lib/map');
var convert = require('./lib/convert');
var settings = require('./package.json');

var argv = require('minimist')(process.argv, {
    string: ["input", "output", "in-network", "in-address"],
    boolean: ["help"],
    alias: {
        "version": "v",
        "output":  "o",
        "input":   "i"
    }
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
    case ("map"):
        map(argv);
        break;
    case ("convert"):
        convert(argv);
        break;
    default:
        help(argv);
        break;
}
