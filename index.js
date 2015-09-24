#!/usr/bin/env node

var help = require('./lib/help');
var map = require('./lib/map');
var settings = require('./package.json');

var argv = require('minimist')(process.argv, {
    string: ["output", "in-network", "in-address"],
    boolean: ["help"],
    alias: {
        "version": "v",
        "output":  "o"
    }
});

if (argv.help) { 
    help(argv); 
    process.exit(0);
} else if (argv.version) {
    console.log(settings.name + ' version ' + settings.version);
}


switch (argv._[2]) {
    case ("help"):
        help(argv);
        break;
    case ("map"):
        map(argv);
        break;
    default:
        help(argv);
        break;
}
