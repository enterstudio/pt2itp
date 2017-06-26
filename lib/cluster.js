const buffer = require('./buffer');
const linker = require('./linker');

const turf = require('@turf/turf');
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

    adoption(cb) {
        this.pool.query(`
                BEGIN;
		ALTER TABLE network_cluster ADD COLUMN address_text TEXT;
		UPDATE network_cluster n SET address_text=a._text FROM address_cluster a WHERE n.address = a.id;
		ALTER TABLE address_cluster ADD COLUMN orphan_adoptive_parent BIGINT;
		UPDATE address_cluster a SET orphan_adoptive_parent=n.address FROM network_cluster n WHERE (a._text=n.address_text AND ST_Intersects(n.buffer, a.geom) AND a.id NOT IN (SELECT address FROM network_cluster WHERE address IS NOT NULL)) OR (a.id=n.address);
		CREATE TABLE orphan_groups AS SELECT orphan_adoptive_parent, ST_CollectionExtract(ST_Collect(geom),1) AS geom FROM address_cluster GROUP BY orphan_adoptive_parent;
		UPDATE address_cluster a SET geom=o.geom FROM orphan_groups o WHERE o.orphan_adoptive_parent=a.id;
		DELETE FROM address_cluster WHERE id NOT IN (SELECT orphan_adoptive_parent FROM address_cluster WHERE orphan_adoptive_parent IS NOT NULL);
		ALTER TABLE address_cluster DROP COLUMN orphan_adoptive_parent;
		DROP TABLE orphan_groups;
                COMMIT;
        `, (err, res) => {
            return cb(err);
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
