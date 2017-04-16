const Queue = require('d3-queue').queue;
const Cursor = require('pg-cursor');
const prog = require('progress');
const path = require('path');
const pg = require('pg');
const fs = require('fs');

const cluster = require('./cluster');
const buffer = require('./buffer');
const split = require('./split');
const index = require('./index');
const freq = require('./freq');

module.exports = function(argv, cb) {
    if (!cb || typeof cb !== 'function') throw new Error('lib/map.js requires a callback parameter');

    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'output',
                'in-network',
                'in-address',
                'map-network',
                'map-address',
                'tokens',
                'country',
                'db'
            ],
            boolean: [
                'name',
                'skip-import'
            ],
            alias: {
                'in-address': 'in-addresses',
                'map-address': 'map-addresses',
                'output': 'o',
                'tokens': 'token'
            }
        });
    }

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
        let parsed =  JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', argv.tokens), 'utf8'));
        let tokens = {};
        parsed.forEach((parse) => {
            parse.sort((a, b) => {
                return a.length > b.length
            });
            if (parse.length === 1) {
                throw new Error('tokens must be in a min group of two');
            } else if (parse.length > 2) {
                parse.forEach((token, it) => {
                    if (it === 0) return;

                    tokens[token.toLowerCase()] = parse[0].toLowerCase();
                });
            } else {
                tokens[parse[1].toLowerCase()] = parse[0].toLowerCase();
            }

            argv['tokens'] = tokens;
        });

    }

    let output = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));

    let pool = new pg.Pool({
        max: 10,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    });

    if (argv['skip-import']) {
        nameNetwork();
    } else {
        //Get Size of input files to pass to progress bar
        fsQ = Queue();

        fsQ.defer(fs.stat, path.resolve(__dirname, '..',  argv['in-address']));
        fsQ.defer(fs.stat, path.resolve(__dirname, '..',  argv['in-network']));

        fsQ.awaitAll((err, res) => {
            if (err) throw err;

            createIndex(res[0].size + res[1].size);
        });
    }

    //Create Tables, Import, & Optimize by generating indexes
    function createIndex(total) {
        let bar = new prog('[:bar] :percent :etas Importing Data', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: total
        });

        index.init(pool, (err) => {
            indexQ = Queue();

            indexQ.defer(index.copy, pool, fs.createReadStream(path.resolve(__dirname, '..',  argv['in-address'])), 'address', {
                tokens: argv['tokens'],
                map: argv['map-address'],
                bar: bar
            })

            indexQ.defer(index.copy, pool, fs.createReadStream(path.resolve(__dirname, '..',  argv['in-network'])), 'network', {
                tokens: argv['tokens'],
                map: argv['map-network'],
                bar: bar
            })

            indexQ.awaitAll((err) => {
                if (err) throw err;
                console.error('ok - imported data');

                index.optimize(pool, nameNetwork)
            });
        });
    }

    function nameNetwork(err) {
        if (err) throw err;
        console.error('ok - optimized data')

        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query('SELECT count(*) FROM network WHERE text = \'\';', (err, res) => {
                if (err) return cb(err);

                let bar = new prog('[:bar] :percent :etas Interpolating Missing Names', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: res.rows[0].count++
                });
                bar.tick(1);

                let cursor = client.query(new Cursor(`SELECT id FROM network WHERE text = '';`));

                let batch = 0;

                return iterate();

                function iterate() {
                    cursor.read(100, (err, rows) => {
                        if (!rows.length) {
                            pg_done();
                            return getNames();
                        }

                        let nameQ = Queue();

                        for (let row_it = 0; row_it < rows.length; row_it++) {
                            nameQ.defer(cluster.name, rows[row_it].id, pool);
                        }

                        nameQ.await((err) => {
                            if (err) return cb(err);

                            console.error('ok - named unnamed streets ' + batch);
                            batch++;

                            bar.tick(rows.length);
                            return iterate();
                        });
                    });
                }
            });
        });
    }

    function getNames() {
        let nameQ = Queue();

        nameQ.defer((done) => {
            pool.query('SELECT text FROM network WHERE text IS NOT NULL GROUP BY text', (err, res) => {
                if (err) return done(err);

                res = res.rows.map((a) => {
                    return a.text;
                });

                return done(null, { network: res });
            });

        });

        nameQ.defer((done) => {
            pool.query('SELECT text FROM address WHERE text IS NOT NULL GROUP BY text', (err, res) => {
                if (err) return done(err);

                res = res.rows.map((a) => {
                    return a.text;
                });

                return done(null, { address: res });
            });
        });

        nameQ.awaitAll((err, res) => {
            if (err) return cb(err);

            console.error('ok - clustered names');

            mergeNames({
                address: res[0].address ? res[0].address : res[1].address,
                network: res[0].network ? res[0].network : res[1].network
            });
        });
    }

    function mergeNames(names) {
        let mergeQ = Queue();

        mergeQ.defer(cluster.address, pool);
        mergeQ.defer(cluster.network, pool);

        mergeQ.await((err) => {
            if (err) return cb(err);

            console.error('ok - geometries clustered');

            cluster.optimize(pool, (err) => {
                if (err) return cb(err);

                console.error('ok - created cluster indexes');

                let calcFreq = freq(names.network, names.address);

                console.error('ok - calculated frequency');

                matcher(calcFreq);
            });
        });
    }

    function matcher(calcFreq) {
        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query(`SELECT count(*) FROM network_cluster WHERE text != '' AND TEXT IS NOT NULL`, (err, res) => {
                if (err) return cb(err);

                let bar = new prog('[:bar] :percent :etas Cross Matching Data', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: parseInt(res.rows[0].count)
                });

                let cursor = client.query(new Cursor(`SELECT id FROM network_cluster WHERE text != '' AND TEXT IS NOT NULL;`));
                let batch = 0;

                return iterate();

                function iterate() {
                    cursor.read(100, (err, rows) => {
                        if (err) return cb(err);

                        if (!rows.length) {
                            pg_done();
                            return splitter();
                        }

                        let matchQ = Queue();

                        for (let row_it = 0; row_it < rows.length; row_it++) {
                            matchQ.defer(cluster.match, rows[row_it].id, calcFreq, pool);
                        }

                        matchQ.await((err) => {
                            if (err) return cb(err);

                            bar.tick(rows.length);
                            batch++;

                            return iterate();
                        });
                    });
                }
            });
        });
    }

    function splitter() {
        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query(`SELECT count(*) FROM network_cluster WHERE text != '' AND address IS NOT NULL;`, (err, res) => {
                if (err) return cb(err);

                let bar = new prog('[:bar] :percent :etas Splitting Data', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: parseInt(res.rows[0].count)
                });


                //If we want all streets and not just clusters that have an address cluster match we need to write addresses
                //  to file that are WHERE text != '' AND address IS NULL;
                let cursor = client.query(new Cursor(`SELECT id FROM network_cluster WHERE text != '' AND address IS NOT NULL;`));
                let batch = 0;

                return iterate();

                function iterate() {
                    cursor.read(100, (err, rows) => {
                        if (err) return cb(err);

                        if (!rows.length) {
                            pg_done();
                            return finalize();
                        }

                        let splitQ = Queue();

                        for (let row_it = 0; row_it < rows.length; row_it++) {
                            splitQ.defer(split, argv, rows[row_it].id, pool, output);
                        }

                        splitQ.await((err) => {
                            if (err) return cb(err);

                            bar.tick(100);

                            batch++;

                            return iterate();
                        });
                    });
                }
            });
        });
    }

    function finalize() {
        console.error('ok - addresses assigned to linestring');
        output.end();
        pool.end();

        return cb();
    }
}
