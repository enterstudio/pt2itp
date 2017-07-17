const buffer = require('./buffer');
const dist = require('fast-levenshtein').get;
const Cursor = require('pg-cursor');
const turf = require('@turf/turf');
const Queue = require('d3-queue').queue;
const _ = require('lodash');
const wk = require('wellknown');

class Cluster {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * This clusters address points
     */
    address(segment = 1, cb) {
        this.pool.query(`
            INSERT INTO address_cluster (text, _text, text_tokenless, geom)
                SELECT
                    addr.text,
                    addr._text,
                    addr.text_tokenless,
                    ST_Multi(ST_CollectionExtract(addr.geom, 1)) AS geom
                FROM (
                    SELECT
                        text,
                        MAX(_text) AS _text,
                        MAX(text_tokenless) AS text_tokenless,
                        unnest(ST_ClusterWithin(geom, 0.01)) AS geom
                    FROM address
                    WHERE segment = ${segment}
                    GROUP BY text
                ) addr;
        `, (err, res) => {
            console.error(`ok - clustered addresses - seg: ${segment}`);

            return cb(err);
        });
    }

    /**
     * This clusters linestrings
     */
    network(segment = 1, cb) {
        this.pool.query(`
            INSERT INTO network_cluster (text, _text, text_tokenless, geom, buffer)
                SELECT
                    netw.text,
                    netw._text,
                    netw.text_tokenless,
                    ST_Multi(ST_CollectionExtract(netw.geom, 2)) AS geom,
                     ST_Buffer(ST_Envelope(geom), 0.01) AS buffer
                FROM (
                    SELECT
                        text,
                        MAX(_text) AS _text,
                        MAX(text_tokenless) AS text_tokenless,
                        unnest(ST_ClusterWithin(geom, 0.01)) AS geom
                    FROM network
                    WHERE segment = ${segment}
                    GROUP BY text
                ) netw;
        `, (err, res) => {
            console.error(`ok - clustered network - seg: ${segment}`);

            return cb(err);
        });
    }


    /**
    * Expands address_clusters with identically-named but unmatched nearby address clusters
    **/
    adoption(cb) {
        this.pool.query(`
                BEGIN;
                ALTER TABLE network_cluster DROP COLUMN IF EXISTS address_text;
                ALTER TABLE network_cluster ADD COLUMN address_text TEXT;
                UPDATE network_cluster n SET address_text=a._text FROM address_cluster a WHERE n.address = a.id;
                ALTER TABLE address_cluster ADD COLUMN orphan_adoptive_parent BIGINT;
                CREATE INDEX orphan_adoptive_parent_idx ON address_cluster (orphan_adoptive_parent);
                CREATE INDEX address_cluster_text_idx ON address_cluster (_text);
                CREATE INDEX network_cluster_text_idx ON network_cluster (address_text);
                UPDATE address_cluster a SET orphan_adoptive_parent=n.address FROM network_cluster n WHERE (a._text=n.address_text AND ST_Intersects(n.buffer, a.geom) AND a.id NOT IN (SELECT address FROM network_cluster WHERE address IS NOT NULL)) OR (a.id=n.address);
                CREATE TEMPORARY TABLE orphan_groups ON COMMIT DROP AS SELECT orphan_adoptive_parent, ST_CollectionExtract(ST_Collect(geom),1) AS geom FROM address_cluster GROUP BY orphan_adoptive_parent;
                UPDATE address_cluster a SET geom=o.geom FROM orphan_groups o WHERE o.orphan_adoptive_parent=a.id;
                DELETE FROM address_cluster WHERE id NOT IN (SELECT orphan_adoptive_parent FROM address_cluster WHERE orphan_adoptive_parent IS NOT NULL);
                ALTER TABLE address_cluster DROP COLUMN orphan_adoptive_parent;
                COMMIT;
        `, (err, res) => {
            return cb(err);
        });
    }

    /**
    * Prune network_cluster assignments where the address_cluster is assigned to more than one
    **/
    prune(cb) {
        let that = this;
        this.pool.connect((err, client, pg_done) => {
            if (err) return cb(err);
            const cursor = client.query(new Cursor(`
                SELECT
                    a.id AS address_id,
                    a.text AS address_text,
                    a.text_tokenless AS address_text_tokenless,
                    n.id AS network_id,
                    n.text AS network_text,
                    n.text_tokenless AS network_text_tokenless
                FROM network_cluster n inner join address_cluster a ON n.address=a.id
                WHERE n.address IN
                    (SELECT address FROM network_cluster WHERE address IS NOT NULL GROUP BY address HAVING COUNT(address) > 1)
                ORDER BY a.id ASC;
            `));

            function pruneBatch(batch, cb2) {
                let bestMatch = null;
                for (let batchi = 0; batchi < batch.length; batchi++) {
                    let cur = batch[batchi];
                    let curDist;
                    if (cur.address_text_tokenless && cur.network_text_tokenless)
                        curDist = (0.25 * dist(cur.address_text, cur.network_text)) + (0.75 * dist(cur.address_text_tokenless, cur.network_text_tokenless));
                    else
                        curDist = dist(cur.address_text, cur.network_text);
                    if (!bestMatch || (curDist < bestMatch[0]))
                        bestMatch = [curDist, cur.network_id];
                }
                // return a list of all network_ids that are not the best match
                return cb2(null, batch.map((x) => { return x.network_id; }).filter((x) => { return x !== bestMatch[1]; }));
            }

            let batch = [];
            let q = Queue();

            iterate();

            function iterate() {
                cursor.read(100, (err, rows) => {
                    if (!rows.length) {
                        if (batch.length)
                            q.defer(pruneBatch, batch);
                        q.awaitAll((err, results) => {
                            let deleteMe = results.reduce((prev, cur) => { return prev.concat(cur); }, []).join(',');
                            that.pool.query(`UPDATE network_cluster SET address=NULL WHERE id IN (${deleteMe});`, (err, res) => {
                            if (err) return cb(err);
                            pg_done();
                            return cb();
                            });
                        });
                    }
                    else {
                        rows.forEach((row) => {
                            if ((batch.length > 0) && (batch[batch.length - 1].address_id !== row.address_id)) {
                                q.defer(pruneBatch, batch.slice(0));
                                batch = [];
                            }
                            batch.push(row);
                        });

                        return iterate();
                    }
                });
            }
        });
    }

    optimize(cb) {
        this.pool.query(`
            BEGIN;
            CREATE INDEX IF NOT EXISTS address_cluster_gix ON address_cluster USING GIST (geom);
            CREATE INDEX IF NOT EXISTS network_cluster_gix ON network_cluster USING GIST (geom);
            CLUSTER address_cluster USING address_cluster_gix;
            CLUSTER network_cluster USING network_cluster_gix;
            ANALYZE address_cluster;
            ANALYZE network_cluster;
            COMMIT;
        `, (err, res) => {
            return cb(err);
        });
    }

    name(id, cb) {
        this.pool.query(`SELECT ST_AsGeoJSON(geom) AS geom FROM network WHERE id = ${id}`, (err, res) => {
            if (err) return cb(err);

            let str = JSON.parse(res.rows[0].geom);

            let buff = buffer(str, 0.1).geometry;

            let names = {};

            this.pool.query(`SELECT text, text_tokenless, _text FROM address WHERE ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(buff)}'), 4326))`, (err, res) => {
                if (err) return cb(err);

                for (let res_it = 0; res_it < res.rows.length; res_it++) {
                    let text = JSON.stringify([
                        res.rows[res_it].text,
                        res.rows[res_it].text_tokenless,
                        res.rows[res_it]._text
                    ]);

                    if (!names[text]) names[text] = 1;
                    else names[text]++;
                }

                let str = Object.keys(names);

                str.sort((a, b) => {
                    return names[b] - names[a];
                });

                if (!str.length) return cb();

                let text = JSON.parse(str[0]);

                this.pool.query(`
                    UPDATE
                        network
                    SET
                        text = '${text[0]}',
                        text_tokenless = '${text[1]}',
                        _text = '${text[2]}',
                        named = TRUE
                    WHERE
                        id = ${id}
                `, (err, res) => {
                    return cb(err);
                });
            });
        });
    }
}

module.exports = Cluster;
