module.exports = index;

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
function index(pool, stream, type, opts, cb) {
    var insertID = -1;

    var map = false;
    if (opts.map) {
        map = require(__dirname + '/../' + opts.map);
        if (!map.map || typeof map.map !== 'function') return cb(new Error('--map module must expose map function'));
    }

    pool.connect(function(err, client, release) {
        if (err) return cb(err);

        client.query('CREATE TABLE '+type+' (id INT, text TEXT, data TEXT)', function(err, res) {
            if (err) return cb(err);

            createRL(client, release);
        });
    });

    function createRL(client, release) {
        var ql = 'BEGIN;';

        var rl = readline.createInterface({
            input: stream,
            output: null
        });

        rl.on('line', function(line) {
            if (!line.length) return; //Usually an empty line

            var currentID = ++insertID;

            var ender = false;
            if (currentID % 1000 === 0 && currentID !== 0) {
                rl.pause();
                ender = true;
            }

            line = line.replace(/'/, "''", 'g');

            var feat = JSON.parse(line);

            if (map) feat = map.map(feat);

            if (feat === false && ender) {
                return commit();
            } else if (feat === false) {
                return;
            }

            if (feat.properties.street === undefined) return cb(new Error('missing street property'));

            feat.properties['carmen:text'] = feat.properties.street; //Retain original formatting

            if (feat.properties.street.length > 0) {
                //@TODO HACK - need to support alt names eventually
                if (Array.isArray(feat.properties.street)) feat.properties.street = feat.properties.street[0];

                feat.properties.street = tokenize(feat.properties.street, opts.tokens);
            } else {
                feat.properties.street = [];
            }

            var str = feat.properties.street.length ? JSON.stringify(feat.properties.street.join(' ')) : '';
            ql = ql + "INSERT INTO "+type+" (id, text, data) VALUES ("+ currentID +",'" + str + "','" + line + "');";

            commit();

            function commit() {
                ql = ql + "COMMIT;";

                client.query(ql, function(err, res) {
                    if (err) return cb(err);

                    rl.resume();
                });
                ql = "BEGIN;";
            }
        });

        rl.on('error', function(err) {
            return cb(err);
        });

        rl.on('close', function() {
            client.query(ql + 'COMMIT;', function(err, res) {
                if (err) return cb(err);

                release();

                return cb();
            });
        });
    }
}
