#!/usr/bin/env node

var help = require('./lib/help');
var map = require('./lib/map');
var convert = require('./lib/convert');
var settings = require('./package.json');
var util = require('./lib/util');
var name = require('./lib/name');

var argv = require('minimist')(process.argv, {
    string: ["input", "output", "in-network", "in-address", "tokens", "map", "coords", "xy", "raw"],
    integer: ["workers", "zoom"],
    boolean: ["help", "debug"],
    alias: {
        "in-address": "in-addresses",
        "version": "v",
        "output":  "o",
        "input":   "i",
        "tokens": "token"
    }
});

if (argv.help) {
    help(argv);
    process.exit(0);
} else if (argv.version) {
    console.log(settings.name + '@' + settings.version);
    process.exit(0);
}

if (!argv.debug && process.env.DEBUG) argv.debug = true;
if (!argv.workers && process.env.WORKERS) argv.workers = parseInt(process.env.WORKERS);

switch (argv._[2]) {
    case ("help"):
        help(argv);
        break;
    case ("util"):
        util(argv, function(err, res) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            } else {
                console.log(res);
                process.exit(0);
            }
        });
        break;
    case ("name"):
    case ("map"):
        map(argv);
        break;
    case ("convert"):
        convert(argv, function(err) {
            if (err) {
                console.error(err.toString());
                process.exit(1);
            } else {
                process.exit(0);
            }
        });
        break;
    default:
        help(argv);
        break;
}
