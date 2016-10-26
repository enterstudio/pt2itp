var Queue = require('d3-queue').queue;
var pg = require('pg');
var path = require('path');
var fs = require('fs');

var cluster = require('./cluster');
var buffer = require('./buffer');
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
            "tokens",
            "db"
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
    } else if (!argv.db) {
        return cb(new Error('--db=<DATABASE> argument required'));
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

    var pool = new pg.Pool({
        max: 10,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    });

    indexFeat();

    function indexFeat() {
        var indexQ = Queue();

        indexQ.defer(function(done) {
            addressStream = fs.createReadStream(path.join(__dirname, '..',  argv['in-address']));

            index(pool, addressStream, 'address', {
                tokens: argv['tokens'],
                map: argv['map-address']
            }, function(err, res) {
                if (err) return done(err);
                return done(null, res);
            });
        });

        indexQ.defer(function(done) {
            networkStream = fs.createReadStream(path.join(__dirname, '..', argv['in-network']));

            index(pool, networkStream, 'network', {
                tokens: argv['tokens'],
                map: argv['map-network']
            }, function(err, res) {
                if (err) return done(err);
                return done(null, res);
            });
        });

        indexQ.awaitAll(function(err, res) {
            if (err) return cb(err);

            console.error('ok - imported data');

            nameNetwork();
        });
    }

    function nameNetwork() {

        pool.query(`SELECT id FROM network WHERE text = '';`, function(err, res) {
            if (err) return cb(err);

            var nameQ = Queue();

            for (var row_it = 0; row_it < res.rows.length; row_it++) {
                nameQ.defer(cluster.name, res.rows[row_it].id, pool);
            }

            nameQ.await(function(err, res) {
                if (err) return cb(err);

                console.log('ok - named unnamed streets');

                getNames();
            });
        });
    }

    function getNames() {
        var nameQ = Queue();

        nameQ.defer(function(done) {
            networkTerms = pool.query('SELECT text FROM network GROUP BY text', function(err, res) {
                if (err) return done(err);

                res = res.rows.map(function(a) {
                    return a.text;
                });

                return done(null, { network: res });
            });

        });

        nameQ.defer(function(done) {
            addressTerms = pool.query('SELECT text FROM address GROUP BY text', function(err, res) {
                if (err) return done(err);

                res = res.rows.map(function(a) {
                    return a.text;
                });

                return done(null, { address: res });
            });
        });

        nameQ.awaitAll(function(err, res) {
            if (err) return cb(err);

            console.log('ok - clustered names');

            mergeNames({
                address: res[0].address ? res[0].address : res[1].address,
                network: res[0].network ? res[0].network : res[1].network
            });
        });
    }

    function mergeNames(names) {
        var groupQ = Queue();

        for (var address_it = 0; address_it < names.address.length; address_it++) {
            groupQ.defer(cluster.address, names.address[address_it], pool);
        }

        for (var network_it = 0; network_it < names.network.length; network_it++) {
            groupQ.defer(cluster.network, names.network[network_it], pool);
        }

        groupQ.await(function(err) {
            if (err) return cb(err);

            console.log('ok - geometries clustered');

            pool.query(`
                BEGIN;
                CREATE INDEX address_cluster_gix ON address_cluster USING GIST (geom);
                CREATE INDEX network_cluster_gix ON network_cluster USING GIST (geom);
                CLUSTER address_cluster USING address_cluster_gix;
                CLUSTER network_cluster USING network_cluster_gix;
                ANALYZE address_cluster;
                ANALYZE network_clsuter;
                COMMIT;
            `, function(err, res) {
                if (err) return cb(err);

                pool.query(`SELECT id FROM network_cluster WHERE text != '';`, function(err, res) {
                    if (err) return cb(err);

                    matcher(res.rows);
                });
            });
        });
    }

    function matcher(networkIds) {
        var matchQ = Queue();

        for (var network_it = 0; network_it < networkIds.length; network_it++) {
            matchQ.defer(cluster.mastch, networkIds[network_it].id, pool);
        }

        matchQ.await(function(err) {
            if (err) return cb(err);

            console.log('ok - matched network with addresses');
        });
    }
}
