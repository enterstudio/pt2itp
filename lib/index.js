module.exports.str = str;
module.exports.init = init;
module.exports.optimize = optimize;
module.exports.copy = copy;

const readline = require('readline');
const tokenize = require('./tokenize');
const os = require('os');
const fs = require('fs');
const pgcopy = require('pg-copy-streams').from;

function str(s) {
    if (typeof s === 'string') return s.replace(/\|/g, '');
    return s;
}

function init(pool, cb) {
    pool.connect((err, client, release) => {
        if (err) return cb(err);

        client.query(`
            BEGIN;
            CREATE TABLE address (id SERIAL, text TEXT, _text TEXT, number INT, geomtext TEXT, geom GEOMETRY(POINT, 4326));
            CREATE TABLE address_cluster (id SERIAL, text TEXT, _text TEXT, number TEXT, geom GEOMETRY(MULTIPOINT, 4326));
            CREATE TABLE network (id SERIAL, text TEXT, _text TEXT, named BOOLEAN, geomtext TEXT, geom GEOMETRY(LINESTRING, 4326));
            CREATE TABLE network_cluster (id SERIAL, text TEXT, _text TEXT, address INT, geom GEOMETRY(MULTILINESTRING, 4326));
            COMMIT;
        `, (err, res) => {
            client.release();
            if (err) return cb(err);
            return cb();
        });
    });
}

function optimize(pool, cb) {
    pool.connect((err, client, release) => {
        if (err) return cb(err);
        client.query(`
            BEGIN;
            CREATE INDEX network_gix ON network USING GIST (geom);
            CLUSTER network USING network_gix;
            ANALYZE network;
            CREATE INDEX address_gix ON address USING GIST (geom);
            CLUSTER address USING address_gix;
            ANALYZE address;
            COMMIT;
        `, function(err, res) {
            client.release();

            return cb(err);
        });
    });
}

/**
 * Index/bucket a stream of geojson features into groups of similiarly named features
 *
 * @param {Pool}   pool     Postgresql Client Pool
 * @param {Stream} stream   of geojson Features to be indexed by `street` property
 * @param {String} type     type of geojson feature - either `address` or `network`
 * @param {Object} opts     optional arguments
 *                          opts.tokens - JSON Object in the form of a token replacement file. See ./lib/tokens/ for examples
 *                          opts.map    - JS module to filter/convert input into pt2itp accepted format
 * @param {Function} cb     callback funtion
 * @return {Function}       in the form fxn(err)
*/
function copy(pool, stream, type, opts = {}, cb) {
    if (opts.map) {
        opts.map = require(__dirname + '/../' + opts.map).map;
        if (!map.map || typeof map.map !== 'function') return cb(new Error('--map module must expose map function'));
    } else {
        opts.map = false;
    }
    pool.connect((err, client, release) => {
        let copyStream;
        if (type === 'address') copyStream = client.query(pgcopy(`COPY address (text, _text, geomtext, number) FROM STDIN WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';`));
        else copyStream = client.query(pgcopy(`COPY network (text, _text, geomtext) FROM STDIN WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';`))

        //copyStream = process.stdout;

        let rl = readline.createInterface({
            input: stream,
            output: copyStream
        });

        rl.on('line', function(line) {
            if (!line.length) return;
            let feat = JSON.parse(line);

            if (opts.map) feat = opts.map(feat);
            if (!feat) return;

            if (feat.properties.street === undefined) return cb(new Error('missing street property'));

            feat.properties._text = feat.properties.street;

            if (feat.properties.street.length > 0) {
                //@TODO HACK - need to support alt names eventually
                if (Array.isArray(feat.properties.street)) feat.properties.street = feat.properties.street[0];

                feat.properties.street = tokenize(feat.properties.street, opts.tokens).join(' ');
            } else {
                feat.properties.street = '';
            }

            if (type === 'address') {
                if (feat.properties.number === null) return;
                rl.output.write(`${str(feat.properties.street)}|${str(feat.properties._text)}|${JSON.stringify(str(feat.geometry))}|${str(feat.properties.number)}\n`);
            } else {
                rl.output.write(`${str(feat.properties.street)}|${str(feat.properties._text)}|${str(JSON.stringify(feat.geometry))}\n`);
            }
        });

        rl.on('error', function(err) {
            return cb(err);
        });
    });
}
