const tokens = require('@mapbox/geocoder-abbreviations')
const Queue = require('d3-queue').queue;
const Cursor = require('pg-cursor');
const CP = require('child_process');
const prog = require('progress');
const path = require('path');
const turf = require('@turf/turf');
const pg = require('pg');
const fs = require('fs');
const os = require('os');

const CPUS  = os.cpus().length;

const Cluster = require('./cluster');
const Index = require('./index');

const buffer = require('./buffer');
const split = require('./split');
const linesplit = require('split');
const misc = require('./misc');

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
                'error-network',
                'error-address',
                'segment',
                'tokens',
                'country',
                'db'
            ],
            boolean: [
                'name',
                'debug',
                'skip-import'
            ],
            alias: {
                'in-address': 'in-addresses',
                'map-address': 'map-addresses',
                'segments': 'segment',
                'database': 'db',
                'output': 'o',
                'tokens': 'token'
            }
        });
    }

    if (!argv['in-address'] && !argv['skip-import']) {
        return cb(new Error('--in-address=<FILE.geojson> argument required'));
    } else if (!argv['in-network'] && !argv['skip-import']) {
        return cb(new Error('--in-network=<FILE.geojson> argument required'));
    } else if (!argv.output) {
        return cb(new Error('--output=<FILE.geojson> argument required'));
    } else if (!argv.db) {
        return cb(new Error('--db=<DATABASE> argument required'));
    }

    if (argv['map-network']) argv['map-network'] = path.resolve(__dirname, './map/', argv['map-network'] + '.js');
    if (argv['map-address']) argv['map-address'] = path.resolve(__dirname, './map/', argv['map-address'] + '.js');

    if (argv['error-network']) argv['error-network'] = fs.createWriteStream(path.resolve(__dirname, '..', argv['error-network']));
    if (argv['error-address']) argv['error-address'] = fs.createWriteStream(path.resolve(__dirname, '..', argv['error-address']));

    if (argv.segment) argv.segment = path.resolve(__dirname, '..',  argv.segment);

    if (argv.tokens) {
        argv.tokens = argv.tokens.split(',');

        let parsed = [];
        argv.tokens.forEach((token) => {
            parsed = parsed.concat(tokens(token, true)); // pull singletons in, too -- ie tokens that are common but have no abbreviation
        });

        let parsedTokens = {};
        parsed.forEach((parse) => {
            parse.sort((a, b) => {
                return a.length > b.length
            });

            // we intentionally mark the smallest token as a replacement for itself
            // this seems silly but it lets us exclude it from text_tokenless in cases where it's pre-abbreviated
            for (let pi = 0; pi < parse.length; pi++)
                parsedTokens[parse[pi].toLowerCase()] = parse[0].toLowerCase();

            argv.tokens = parsedTokens;
        });
    }

    const output = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));

    const poolConf = {
        max: process.env.CI ? 10 : CPUS,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    }

    const pool = new pg.Pool(poolConf);

    const cluster = new Cluster(pool);
    const index = new Index(pool);

    if (argv['skip-import']) {
        pool.query(`
            BEGIN;
                DELETE FROM address_cluster;
                DELETE FROM network_cluster;
            COMMIT;
        `, (err, res) => {
            if (err) return cb(err);

            return nameNetwork();
        });
    } else {
        createIndex();
    }

    //Create Tables, Import, & Optimize by generating indexes
    function createIndex() {
        index.init((err) => {
            if (err) return cb(err);

            //Set Some Args to metatable - Don't wait for callback as we won't actually use those in this module - they are useful for debug/test/etc modes
            index.setMeta('tokens', argv.tokens);
            index.setMeta('country', argv.country);

            indexQ = Queue();

            indexQ.defer((done) => {
                index.copy(argv['in-address'], 'address', {
                    tokens: argv.tokens,
                    map: argv['map-address'],
                    error: argv['error-address']
                }, done);
            });

            indexQ.defer((done) => {
                index.copy(argv['in-network'], 'network', {
                    tokens: argv['tokens'],
                    error: argv['error-network'],
                    map: argv['map-network']
                }, done);
            });

            indexQ.awaitAll((err, res) => {
                if (err) return cb(err);

                if (!res[0] && !res[1]) return cb(new Error('A unitMap was not returned by index.copy'));

                argv.unitMap = res[0] ? res[0] : res[1];

                index.setMeta('units', argv.unitMap);

                console.error('ok - imported data');

                index.optimize(nameNetwork)
            });
        });
    }

    //Attempt to add names to any unanmed streets
    function nameNetwork(err) {
        if (err) throw err;
        console.error('ok - optimized data')

        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query('SELECT count(*) FROM network WHERE text = \'\';', (err, res) => {
                if (err) return cb(err);

                const bar = new prog('ok - Interpolating Missing Names [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: res.rows[0].count++
                });
                bar.tick(1);

                const cursor = client.query(new Cursor(`SELECT id FROM network WHERE text = '';`));

                let batch = 0;

                return iterate();

                function iterate() {
                    cursor.read(100, (err, rows) => {
                        if (!rows.length) {
                            pg_done();
                            console.error('ok - beginning segmenting');
                            return index.segment(argv.segment, null, clusterGeom);
                        }

                        const nameQ = Queue();

                        for (let row_it = 0; row_it < rows.length; row_it++) {
                            nameQ.defer(cluster.name, rows[row_it].id);
                        }

                        nameQ.await((err) => {
                            if (err) return cb(err);

                            console.error('ok - named unnamed streets ' + batch);
                            batch++;

                            pg_done();

                            bar.tick(rows.length);
                            return iterate();
                        });
                    });
                }
            });
        });
    }

    function clusterGeom(err, segs) {
        if (err) return cb(err);

        console.error('ok - geoms segmented');

        const clusterQ = Queue(parseInt(CPUS / 2));

        for (let seg of segs) {
            clusterQ.defer((seg, done) => {
                cluster.address(seg, done);
            }, seg);

            clusterQ.defer((seg, done) => {
                cluster.network(seg, done);
            }, seg);
        }

        clusterQ.await((err) => {
            if (err) return cb(err);

            console.error('ok - geometries clustered');

            cluster.optimize((err) => {
                if (err) return cb(err);

                console.error('ok - created cluster indexes');

                return matcher();
            });
        });
    }

    function matcher() {
        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query(`SELECT id FROM network_cluster WHERE text != '' AND TEXT IS NOT NULL`, (err, res) => {
                if (err) return cb(err);

                if (res.rows[0].count === 0) return cb(new Error('Network Cluster has no geometries to cluster!'));

                const bar = new prog('ok - Cross Matching Data [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: res.rows.length++
                });

                bar.tick(1); //Show progress bar

                let cpu_spawn = Math.min(Math.ceil(res.rows.length / 10000), CPUS); //number of 10000 groups or # of CPUs, whichever is smaller
                let nursery = [];

                let ids = res.rows.map((row) => { return row.id });

                while (cpu_spawn--) {
                    let child = CP.fork(path.resolve(__dirname, './match'));

                    child.on('message', (message) => {
                        if (message.error) return cb(err);

                        if (message.jobs) bar.tick(message.jobs);

                        if (!ids.length) {
                            nursery[message.id].active = false;
                            nursery[message.id].child.kill();

                            let active = nursery.filter((instance) => {
                                if (instance.active) return true;
                                else return false;
                            });

                            if (!active.length) {
                                pg_done();
                                return splitter();
                            }
                        } else {
                            nursery[message.id].child.send(ids.splice(0, 10000));
                        }
                    });

                    let id = nursery.push({
                        active: true,
                        child: child
                    }) - 1;

                    child.send({
                        id: id,
                        pool: poolConf
                    });
                }
            });
        });
    }

    function splitter() {
        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query(`SELECT id FROM network_cluster WHERE text != '' AND address IS NOT NULL;`, (err, res) => {
                if (err) return cb(err);

                if (res.rows[0].count === 0) return cb(new Error('Network Cluster has no geometries to cluster!'));

                const bar = new prog('ok - Splitting Data [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: res.rows.length++
                });

                bar.tick(1); //Show progress bar

                let cpu_spawn = Math.min(Math.ceil(res.rows.length / 1000), CPUS); //number of 1000 groups or # of CPUs, whichever is smaller
                let nursery = [];

                let ids = res.rows.map((row) => { return row.id });

                while (cpu_spawn--) {
                    let child = CP.fork(path.resolve(__dirname, './split'), {
                        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                    });

                    child.stdin.on('error', epipe);
                    child.stdout.on('error', epipe);
                    child.stderr.on('error', epipe);

                    child.stdout
                        .pipe(linesplit())
                        .on('data', (line) => {
                            output.write(line + '\n');
                        });
                    child.stderr.pipe(process.stderr);

                    child.on('message', (message) => {
                        if (message.error) return cb(err);

                        if (message.jobs) bar.tick(message.jobs);

                        if (!ids.length) {
                            nursery[message.id].active = false;
                            nursery[message.id].child.kill();

                            let active = nursery.filter((instance) => {
                                if (instance.active) return true;
                                else return false;
                            });

                            if (!active.length) {
                                pg_done();
                                return orphanAddr();
                            }
                        } else {
                            nursery[message.id].child.send(ids.splice(0, 1000));
                        }
                    });

                    let id = nursery.push({
                        active: true,
                        child: child
                    }) - 1;

                    child.send({
                        id: id,
                        unitMap: argv.unitMap,
                        country: argv.country,
                        debug: argv.debug,
                        pool: poolConf
                    });
                }
            });
        });
    }

    function orphanAddr() {
        pool.connect((err, client, pg_done) => {
            if (err) return cb(err);

            client.query(`SELECT count(*) FROM address_cluster a LEFT JOIN network_cluster n ON a.id = n.address WHERE n.address IS NULL;`, (err, res) => {
                if (err) return cb(err);

                const bar = new prog('ok - Formatting Unmached Addresses [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: parseInt(res.rows[0].count)
                });

                const cursor = client.query(new Cursor(`SELECT a._text, ST_AsGeoJSON(a.geom) AS geom FROM address_cluster a LEFT JOIN network_cluster n ON a.id = n.address WHERE n.address IS NULL;`));

                return iterate();

                function iterate() {
                    cursor.read(100, (err, rows) => {
                        if (err) return cb(err);

                        if (!rows.length) {
                            pg_done();
                            console.error('ok - addresses assigned to linestring');
                            return cluster.adoption(finalize);
                        }

                        rows.forEach((row) => {
                            let feat = {
                                type: 'Feature',
                                properties: {
                                    'carmen:text': row._text,
                                    'carmen:center': false,
                                    'carmen:addressnumber': []
                                },
                                geometry: {
                                    type: 'GeometryCollection',
                                    geometries: [{
                                        type: 'MultiPoint',
                                        coordinates: []
                                    }]
                                }
                            };

                            let geom = JSON.parse(row.geom);

                            geom.coordinates.forEach((coord) => {
                                if (coord[2] % 1 != 0 && argv.unitMap) {
                                    let unit = parseInt(String(coord[2]).split('.')[1]);
                                    let num = String(coord[2]).split('.')[0];

                                    coord[2] = `${num}${argv.unitMap[unit]}`;
                                }

                                feat.properties['carmen:addressnumber'].push(coord.pop());
                                feat.geometry.geometries[0].coordinates.push(coord);
                            });

                            feat.properties['carmen:center'] = turf.pointOnSurface(feat.geometry.geometries[0]).geometry.coordinates;
                            feat.properties['carmen:addressnumber'] = [ feat.properties['carmen:addressnumber'] ];

                            if (argv.country) feat.properties['carmen:geocoder_stack'] = argv.country;

                            output.write(JSON.stringify(misc.id(feat)) + '\n');
                        });

                        bar.tick(100);
                        return iterate();
                    });
                }
            });
        });
    }


    function finalize(err) {
        if (err)
        return cb(err);

        console.error('ok - adopted stranded address clusters into stable homes');

        if (argv['error-network']) argv['error-network'].close();
        if (argv['error-address']) argv['error-address'].close();

        output.end();
        pool.end();

        return cb();
    }

    function epipe(err) {
        console.error('not ok - epipe error');
        return cb(err);
    }
}
