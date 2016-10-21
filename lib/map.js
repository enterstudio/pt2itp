var path = require('path');
var fs = require('fs');

var index = require('./index');

module.exports = function(argv, cb) {
    if (!cb || typeof cb !== 'function') throw new Error('lib/map.js requires a callback parameter');

    var argv = require('minimist')(argv, {
        string: [
            "output",
            "in-network",
            "in-address",
            "map-network",
            "map-address",
            "tokens"
        ],
        boolean: [
            "name"
        ],
        alias: {
            "in-address": "in-addresses",
            "map-address": "map-addresses",
            "output": "o",
            "tokens": "token"
        }
    });

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

    addressStream = fs.createReadStream(path.join(__dirname, '..',  argv['in-address']));

    index(addressStream, 'address', {
        tokens: argv['tokens'],
        map: argv['map-address']
    }, function(err, res) {
        if (err) return cb(err);

        console.log('Done');
    });

//    networkStream = fs.createReadStream(__dirname, argv['in-network']);

}
