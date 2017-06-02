const os = require('os');
const fs = require('fs');
const turf = require('@turf/turf');
const path = require('path');
const readline = require('readline');
const title = require('to-title-case');
const CP = require('child_process');

const CPUS  = os.cpus().length;

class Index {
    constructor(pool) {
        this.pool = pool;
    }

    str(s) {
        if (typeof s === 'string') return s.replace(/\|/g, '');
        return s;
    }

    init(cb) {
        this.pool.connect((err, client, release) => {
            if (err) return cb(err);

            client.query(`
                ABORT;
                BEGIN;
                DROP TABLE IF EXISTS meta;
                DROP TABLE IF EXISTS address;
                DROP TABLE IF EXISTS network;
                CREATE TABLE address (id SERIAL, text TEXT, text_tokenless TEXT, _text TEXT, number NUMERIC, lon TEXT, lat TEXT, geom GEOMETRY(POINTZ, 4326));
                CREATE TABLE network (id SERIAL, text TEXT, text_tokenless TEXT, _text TEXT, named BOOLEAN, geomtext TEXT, geom GEOMETRY(LINESTRING, 4326));
                CREATE TABLE meta (k TEXT UNIQUE, v TEXT);
                COMMIT;
            `, (err, res) => {
                client.release();
                return cb(err);
            });
        });
    }

    /**
     * Import a stream of 'map' module generated ITP Features into a given database
     * (Currently used to bring map geojson back into database for debug mode
     *
     * @param {String}      path    to itp geojson file
     * @param {Object}      opts    optional args
     * @param {Function}    cb      Callback
     * @return {Function}           in form fxn(err)
     */
    itp(path, opts = {}, cb) {
        this.pool.query(`
            BEGIN;

            CREATE EXTENSION IF NOT EXISTS POSTGIS;

            DROP TABLE IF EXISTS itp;

            CREATE TABLE itp (id BIGINT, blob JSONB, geom GEOMETRY(GEOMETRY, 4326) );

            COPY itp (blob) FROM '${path}' WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';

            UPDATE itp
                SET
                    geom = ST_Envelope(ST_SetSRID(ST_GeomFromGeoJSON(blob->>'geometry'), 4326)),
                    id = (blob->>'id')::BIGINT;

            CREATE INDEX itp_gix ON itp USING GIST (geom);

            COMMIT;
        `, (err) => {
            return cb(err);
        });
    }

    /**
     * Index/bucket a stream of geojson features into groups of similiarly named features
     *
     * @param {Stream} stream   of geojson Features to be indexed by `street` property
     * @param {String} type     type of geojson feature - either `address` or `network`
     * @param {Object} opts     optional arguments
     *                          opts.tokens - JSON Object in the form of a token replacement file. See ./lib/tokens/ for examples
     *                          opts.map    - JS module to filter/convert input into pt2itp accepted format
     *                          opts.error  - File to write invalid features to
     * @param {Function} cb     callback funtion
     * @return {Function}       in the form fxn(err)
    */
    copy(stream, type, opts = {}, cb) {
        if (!type) return cb(new Error('Type must be address or network'));

        let cpu_spawn = Math.floor(CPUS / 2);
        let nursery = [];

        let psv = `${os.tmpDir()}/${type}-${(new Date).getTime()}.psv`;
        let output = fs.createWriteStream(psv);
        output.on('error', epipe);

        let ready = 0;

        while (cpu_spawn--) {
            let child = CP.fork(path.resolve(__dirname, './copy'), {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });

            let id = nursery.push({
                active: true,
                child: child
            }) - 1;

            child.stdout.pipe(output);
            //if (opts.error) child.stderr.pipe(opts.error);
            child.stderr.pipe(process.stderr);

            child.stdin.on('error', epipe);
            child.stdout.on('error', epipe);
            child.stderr.on('error', epipe);

            child.stdin.on('finish', () => {
                console.error('Im a piece of shit');
            });

            child.send({
                id: id,
                type: type,
                error: false,//opts.error,
                map: opts.map
            });

            child.on('exit', () => {
                console.error('An Import Child Exited!');
            });

            child.on('error', (err) => {
                return cb(err);
            });

            child.on('message', (message) => {
                ready++;
                if (ready >= Math.floor(CPUS / 2)) startStream();
            });
        }
   
        let current = 0     

        function startStream() {
            const rl = readline.createInterface({
                input: stream,
                output: false
            });

            rl.on('line', (line) => {
                if (!line || !line.length) return;
                if (opts.bar) opts.bar.tick(Buffer.byteLength(line, 'utf8'));


                let highWater = !nursery[current].child.stdin.write(`${line}\n`);

                if (highWater) next();
            });
        }

        function epipe(err) {
            //console.error('HERE ERR');

            //return cb(err);
        }

        function next() {
            current++;
            if (current >= Math.floor(CPUS / 2)) current = 0;
        }

        /**
        rl.on('close', () => {
            this.pool.connect((err, client, release) => {
                if (err) return cb(err);

                let query;
                if (type === 'address') query = `COPY address (text, text_tokenless, _text, lon, lat, number) FROM '${psv}' WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';`;
                else query = `COPY network (text, text_tokenless, _text, geomtext) FROM '${psv}' WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';`;

                client.query(String(query), (err, res) => {
                    cb(err);
                    client.release();
                });
            });
        });
        */
    }

    setMeta(key, value, cb) {
        if (typeof value === 'object') value = JSON.stringify(value);

        this.pool.query(`
            INSERT INTO meta (k, v)
                VALUES ('${key}', '${value}')
                ON CONFLICT (k) DO
                    UPDATE SET v = '${value}';
        `, (err, res) => {
            if (cb) return cb(err);
            else if (err) throw err;
        });
    }

    getMeta(key, cb) {
        if (key === true) { //Return all meta
            this.pool.query(`
                SELECT * FROM meta;
            `, (err, res) => {
                if (err) return cb(err);
                if (!res.rows.length) return cb(null, {});

                let meta = {};

                for (let r of res.rows) {
                    try {
                        meta[r.k] = JSON.parse(r.v);
                    } catch (err) {
                        meta[r.k] = r.v;
                    }
                }

                return cb(null, meta);
            });
        } else {
            this.pool.query(`
                SELECT v
                    FROM
                        meta
                    WHERE
                        k = '${key}';
            `, (err, res) => {
                if (!res.rows.length) return cb(new Error('Key not found'));

                let val;
                try {
                    val = JSON.parse(res.rows[0].v);
                } catch (err) {
                    val = res.rows[0].v;
                }

                return cb(err, val);
            });
        }
    }

    optimize(cb) {
        //This is so beautifully hacky it makes me want to cry.
        //ST_ClusterWithin is lossy and individual ids can't be tracked through
        //But it's not calculated in 3D space, but retains 3D coord
        //Set number as 3D coord to track through :') tears of painful happiness
        this.pool.query(`
            BEGIN;
            DELETE FROM address WHERE length(number::TEXT) > 10;

            UPDATE address SET geom = ST_SetSRID(ST_MakePoint(substring(lon from 1 for 10)::NUMERIC, substring(lat from 1 for 10)::NUMERIC, number), 4326);
            UPDATE network SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geomtext), 4326);

            CREATE INDEX network_idx ON network (text);
            CREATE INDEX network_gix ON network USING GIST (geom);
            CLUSTER network USING network_idx;
            ANALYZE network;

            CREATE INDEX address_idx ON address (text);
            CREATE INDEX address_gix ON address USING GIST (geom);
            CLUSTER address USING address_idx;
            ANALYZE address;

            COMMIT;
        `, (err, res) => {
            if (err) return cb(err);

            return cb(err);
        });
    }
}

module.exports = Index;
