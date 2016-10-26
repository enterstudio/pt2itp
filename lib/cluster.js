module.exports.name = name;
module.exports.address = address;
module.exports.network = network;

var buffer = require('./buffer');

var turf = require('@turf/turf');
var _ = require('lodash');

function address(name, pool, cb) {
    pool.query(`
        INSERT INTO address_cluster (text, _text, number, geom) (
            SELECT
                '${name}'                       AS text,
                _text                           AS _text,
                number                          AS number,
                ST_CollectionExtract(geom, 1)   AS geom
            FROM (
                SELECT
                    MAX(_text)                              AS _text,
                    unnest(ST_ClusterWithin(geom, 0.1))     AS geom,
                    array_to_string(array_agg(number), ',') AS number
                FROM address
                WHERE text = '${name}'
            ) f
        );
    `, function(err, res) {
        if (err) return cb(err);

        return cb();
    });
}

function network(name, pool, cb) {
    pool.query(`
        INSERT INTO network_cluster (text, _text, geom) (
            SELECT
                '${name}'                       AS text,
                _text                           AS _text,
                ST_CollectionExtract(geom, 2)   AS geom
            FROM (
                SELECT
                    MAX(_text)                              AS _text,
                    unnest(ST_ClusterWithin(geom, 0.1))     AS geom
                FROM network
                WHERE text = '${name}'
            ) f
        );
    `, function(err, res) {
        if (err) return cb(err);

        return cb();
    });
}

function name(id, pool, cb) {
    pool.query(`SELECT ST_AsGeoJSON(geom) AS geom FROM network WHERE id = ${id}`, function(err, res) {
        var str = JSON.parse(res.rows[0].geom);

        var buff = buffer(str, 0.1).geometry;

        var names = {};

        pool.query(`SELECT text FROM address WHERE ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(buff)}'), 4326))`, function(err, res) {
            if (err) return cb(err);

            for (res_it = 0; res_it < res.rows.length; res_it++) {
                var text = res.rows[res_it].text;

                if (!names[text]) names[text] = 1;
                else names[text]++;
            }

            var str = Object.keys(names);

            str.sort(function(a, b) {
                return names[b] - names[a];
            });

            if (!str.length) return cb();

            pool.query(`
                UPDATE
                    network
                SET
                    text = '${str[0]}',
                    _text = '${str[0]}',
                    named = TRUE
                WHERE
                    id = ${id}
            `, function(err, res) {
                return cb(err);
            });
        });
    });
}
