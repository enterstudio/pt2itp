#!/usr/bin/env node

require('./lib/help');
require('./lib/build');
require('./lib/map');

var argv = require('minimist')(process.argv, {
    string: [],
    boolean: []
});

if (argv.help) { help(argv); }

switch (argv._[2]) {
    case ("help"):  help(argv);
    case ("build"): build();
    case ("map"):   map();
}
