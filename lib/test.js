module.exports = test;

const pg = require('pg');
const fs = require('fs');
const path = require('path');
const prog = require('progress');
const turf = require('@turf/turf');
const Cursor = require('pg-cursor');
const Carmen = require('@mapbox/carmen');
const MBTiles = require('@mapbox/mbtiles');
const Queue = require('d3-queue').queue;

//Use raw addresses to query generated ITP output to check for completeness
function test(argv, cb) {
    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'database',
                'index',
                'output',
                'config'
            ],
            alias: {
                database: 'db',
                output: 'o'
            }
        });
    }

    if (!argv.database) {
        console.error('--database=<DB>');
        process.exit(1);
    } else if (!argv.output) {
        console.error('--output=<output.errors> argument required');
        process.exit(1);
    } else if (!argv.index) {
        console.error('--index=<INDEX.mbtiles> argument required');
        process.exit(1);
    } else if (!argv.config) {
        console.error('--config=<CONFIG.json> argument required');
        process.exit(1);
    }

    let cnf = require(path.resolve(argv.config));
    if (cnf.metadata) cnf = cnf.metadata; //Necessary for internal use

    delete cnf.tiles;
    delete cnf.geocdoer_data;
    delete cnf.geocoder_format;

    const pool = new pg.Pool({
        max: 10,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    });

    const opts = {
        address: new MBTiles(path.resolve(argv.index), () => {})
    };

    opts.address.getInfo = (cb) => {
        return cb(null, cnf);
    };

    const c = new Carmen(opts);
    const stats = {
        fail: 0,
        total: 0
    }

    const cursor_it = 5; //Number of rows to grab at a time from postgres;

    const errOut = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));

    pool.connect((err, client, pg_done) => {
        client.query('SELECT count(*) FROM address_cluster a LEFT JOIN network_cluster n ON a.id = n.address WHERE n.address IS NOT NULL;', (err, res) => {
            const cursor = client.query(new Cursor('SELECT a._text, ST_AsGeoJSON(a.geom) AS geom FROM address_cluster a LEFT JOIN network_cluster n ON a.id = n.address WHERE n.address IS NOT NULL;'));

            const bar = new prog('ok - Testing Network Matched Addresses [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: res.rows[0].count++
            });
            bar.tick(1);

            return iterate();

            function iterate() {
                cursor.read(cursor_it, (err, rows) => {
                    if (!rows.length) {
                        pg_done();
                        return complete();
                    }

                    let addrQ = Queue(25);

                    for (let row of rows) {
                        row.geom = JSON.parse(row.geom);

                        for (addr of row.geom.coordinates) {
                            addrQ.defer((query, opts, done) => {
                                stats.total++;
                                c.geocode(query, opts, (err, res) => {
                                    if (err) return done(err.toString());

                                    if (!res.features.length) return done(null, `${query}|${opts.proximity.join(',')}`);

                                    if (res.features[0].place_name.toLowerCase() !== query.toLowerCase()) return done(null, `${query}|${opts.proximity.join(',')}`);
                                    else if (turf.distance(res.features[0], opts.proximity, 'kilometers') > 1) return done(null, `${query}|${opts.proximity.join(',')}`);

                                    stats.fail++;
                                    return done(null, true);

                                });
                            }, `${addr[2]} ${row._text}`, {
                                proximity: [ addr[0], addr[1] ]
                            });
                        }
                    }

                    addrQ.awaitAll((err, res) => {
                        if (err) return cb(err);

                        for (let r of res) {
                            if (r === true) continue;

                            errOut.write(`${r}\n`);
                        }

                        bar.tick(cursor_it);
                        return iterate();
                    });
                });
            } 

            function complete() {
                console.error(`ok - ${stats.fail}/${stats.total} failed to geocode`);
            }
        });
    });
}
