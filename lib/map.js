var TileReduce = new require('tile-reduce');
var path = require('path');
var fs = require('fs');
var cover = require('tile-cover');

module.exports = function(argv, cb) {
    if (!cb || typeof cb !== 'function') throw new Error('lib/map.js requires a callback parameter');

    if (!argv['in-address']) {
        return cb(new Error('--in-address=<FILE.geojson> argument required'));
    } else if (!argv['in-network']) {
       return cb(new Error('--in-network=<FILE.geojson> argument required'));
    } else if (!argv['output']) {
       return cb(new Error('--output=<FILE.geojson> argument required'));
    }

    if (argv['tokens']) {
        var parsed =  JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', argv.tokens), 'utf8'));
        var tokens = {};
        parsed.forEach(function(parse) {
            parse.sort(function(a, b) {
                return a.length > b.length
            });
            if (parse.length === 1) {
                throw new Error('tokens must be in a min group of two');
            } else if (parse.length > 2) {
                parse.forEach(function(token, it) {
                    if (it === 0) return;

                    tokens[token.toLowerCase()] = parse[0].toLowerCase();
                });
            } else {
                tokens[parse[1].toLowerCase()] = parse[0].toLowerCase();
            }

            argv['tokens'] = tokens;
        });

    }
}
