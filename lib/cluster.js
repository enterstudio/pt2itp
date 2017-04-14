module.exports.name = name;
module.exports.match = match;
module.exports.address = address;
module.exports.network = network;
module.exports.optimize = optimize;

const buffer = require('./buffer');
const linker = require('./linker');

const turf = require('@turf/turf');
const _ = require('lodash');
const wk = require('wellknown');

function address(pool, cb) {
    pool.query(`
        CREATE TABLE address_cluster AS SELECT
            text,
            _text,
            number,
            ST_Multi(geom)
        FROM (
            SELECT
                text,
                MAX(_text) AS _text,
                ST_ClusterWithin(geom, 0.1) AS geom,
                array_to_json(array_agg(number)) AS number
            FROM address
            GROUP BY text
        ) f;
    `, (err, res) => {
        return cb(err);
    });
}

function network(pool, cb) {
    pool.query(`
        CREATE TABLE network_cluster AS SELECT
            text,
            _text,
            ST_Multi(geom)
        FROM (
            SELECT
                text,
                MAX(_text) AS _text,
                ST_ClusterWithin(geom, 0.1) AS geom
            FROM network
            GROUP BY text
        ) f;
    `, (err, res) => {
        return cb(err);
    });
}

function optimize(pool, cb) {
    pool.query(`
        BEGIN;
        CREATE INDEX address_cluster_gix ON address_cluster USING GIST (geom);
        CREATE INDEX network_cluster_gix ON network_cluster USING GIST (geom);
        CLUSTER address_cluster USING address_cluster_gix;
        CLUSTER network_cluster USING network_cluster_gix;
        ANALYZE address_cluster;
        ANALYZE network_cluster;
        COMMIT;
    `, (err, res) => {
        return cb(err);
    });
}

function match(id, freq, pool, cb) {
    pool.query(`
        SELECT
            network.text AS network,
            addr.id,
            addr.text
        FROM
            address_cluster addr,
            network_cluster AS network
        WHERE
            network.id = ${id} AND
            ST_Contains(ST_Buffer(ST_Envelope((SELECT geom FROM network_cluster WHERE id = ${id})), 0.01), addr.geom);
    `, (err, res) => {
        if (err) return cb(err);

        if (!res.rows.length) return cb();

        let address = linker(freq, {
            id: id,
            text: res.rows[0].network.split(' ')
        }, res.rows)

        if (!address) return cb();

        pool.query(`
            UPDATE network_cluster
            SET address = ${address.id}
            WHERE network_cluster.id = ${id};
        `, (err, res) => {
            return cb(err);
        });
    });
}

function name(id, pool, cb) {
    pool.query(`SELECT ST_AsGeoJSON(geom) AS geom FROM network WHERE id = ${id}`, (err, res) => {
        if (err) return cb(err);

        let str = JSON.parse(res.rows[0].geom);

        let buff = buffer(str, 0.1).geometry;

        let names = {};

        pool.query(`SELECT text, _text FROM address WHERE ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(buff)}'), 4326))`, function(err, res) {
            if (err) return cb(err);

            for (res_it = 0; res_it < res.rows.length; res_it++) {
                let text = JSON.stringify([
                    res.rows[res_it].text,
                    res.rows[res_it]._text
                ]);

                if (!names[text]) names[text] = 1;
                else names[text]++;
            }

            let str = Object.keys(names);

            str.sort(function(a, b) {
                return names[b] - names[a];
            });

            if (!str.length) return cb();

            let text = JSON.parse(str[0]);

            pool.query(`
                UPDATE
                    network
                SET
                    text = '${text[0]}',
                    _text = '${text[1]}',
                    named = TRUE
                WHERE
                    id = ${id}
            `, (err, res) => {
                return cb(err);
            });
        });
    });
}
