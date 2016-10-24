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
 *                          opts.map    - JS module to filter/convert input into pt2itp accepted format
 * @param {Function} cb     callback funtion
 * @return {Function}       in the form fxn(err)
*/
function index(stream, type, opts, cb) {
    var insertID = 0;

    var map = false;
    if (opts.map) {
        map = require(__dirname + '/../' + opts.map);
        if (!map.map || typeof map.map !== 'function') return cb(new Error('--map module must expose map function'));
    }

    var db = new sqlite.Database(type+'.sqlite3', function(err) {
        if (err) return cb(err);

        db.run('CREATE TABLE '+type+' (id INT, text TEXT, data TEXT) ', createRL);
    });

    function createRL(err) {
        if (err) return cb(err);

        db.serialize(function() {
            var rl = readline.createInterface({
                input: stream,
                output: null
            });

            rl.on('line', function(line) {
                if (!line.length) return; //Usually an empty line
                var feat = JSON.parse(line);

                if (map) feat = map.map(feat);
                if (feat === false) return; //Map file filtered out feature

                if (feat.properties.street === undefined) return cb(new Error('missing street property'));

                feat.properties['carmen:text'] = feat.properties.street; //Retain original formatting

                if (feat.properties.street.length > 0) {
                    //@TODO HACK - need to support alt names eventually
                    if (Array.isArray(feat.properties.street)) feat.properties.street = feat.properties.street[0];

                    feat.properties.street = tokenize(feat.properties.street, opts.tokens);
                } else {
                    feat.properties.street = [];
                }

                if (insertID === 0) {
                    db.exec("BEGIN");
                } else if (insertID % 1000 === 0) {
                    db.exec("COMMIT");
                    db.exec("BEGIN");
                }

                db.run('INSERT INTO '+type+' (id, text, data) VALUES ($id, $text, $line);', {
                    $id: ++insertID,
                    $text: feat.properties.street.length ? feat.properties.street.join(' ') : false,
                    $line: line
                });
            });

            rl.on('error', function(err) {
                return cb(err);
            });

            rl.on('close', function() {
                if (insertID !== 0) db.exec("COMMIT");

                db.run('CREATE INDEX text_idx ON '+type+' (text);', function() {
                    return cb(null, db);
                });
            });
        });
    }
}
