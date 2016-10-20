module.exports = index;

var sqlite = require('sqlite3');
var readline = require('readline');

/**
 * Index/bucket a stream of geojson features into groups of similiarly named features
 *
 * @param stream of geojson Features to be indexed by `street` property
 * @param type type of geojson feature - either `address` or `network`
 * @param opts optional arguments
 *        opts.tokens - JSON Object in the form of a token replacement file. See ./lib/tokens/ for examples
 * @param cb callback funtion
 * @return fxn in the form fxn(err)
*/

function index(stream, type, opts, cb) {
    var db = new sqlite.Database(type+'.sqlite3', function(err) {
        if (err) return cb(err);

        db.run("CREATE TABLE $type (id INTEGER, text TEXT, data TEXT)", {
            $type: type
        });
    });

    function createRL(err) {
        if (err) return cb(err);

        var rl = readline.createInterface({
            input: stream,
            output: null
        });

        rl.on('line', function(line) {
            var feat = JSON.parse(line);
        });

        rl.on('error', function(err) {
            return cb(err);
        });

        rl.on('close', function() {
            return cb();
        });
    }
}
