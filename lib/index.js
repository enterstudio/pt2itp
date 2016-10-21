module.exports = index;

var sqlite = require('sqlite3');
var readline = require('readline');

var tokenize = require('./tokenize');

/**
 * Index/bucket a stream of geojson features into groups of similiarly named features
 *
 * @param {Stream} stream   of geojson Features to be indexed by `street` property
 * @param {String} type     type of geojson feature - either `address` or `network`
 * @param {Object} opts     optional arguments
 *                          opts.tokens - JSON Object in the form of a token replacement file. See ./lib/tokens/ for examples
 * @param {Function} cb     callback funtion
 * @return {Function}       in the form fxn(err)
*/

function index(stream, type, opts, cb) {
    var insertID = 0;

    var db = new sqlite.Database(type+'.sqlite3', function(err) {
        if (err) return cb(err);

        db.run('CREATE TABLE '+type+' (id INT, text TEXT, data TEXT) ', createRL);
    });

    function createRL(err) {
        if (err) return cb(err);

        var rl = readline.createInterface({
            input: stream,
            output: null
        });

        rl.on('line', function(line) {
            var feat = JSON.parse(line);

            if (!feat.properties.street) return cb(new Error('missing street property'));

            feat.properties['carmen:text'] = feat.properties.street; //Retain original formatting

            var tokens = tokenize(feat.properties.street, opts.tokens);

            db.run('INSERT INTO '+type+' (id, text, data) VALUES ($id, $text, $line);', {
                $id: ++insertID,
                $text: tokens.join(' '),
                $line: line
            });
        });

        rl.on('error', function(err) {
            return cb(err);
        });

        rl.on('close', function() {
            db.close(cb);
        });
    }
}
