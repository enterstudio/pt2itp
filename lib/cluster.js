module.exports.name = name;
module.exports.match = match;
module.exports.address = address;
module.exports.network = network;

var buffer = require('./buffer');
var linker = require('./linker');

var turf = require('@turf/turf');
var _ = require('lodash');
var wk = require('wellknown');

function address(name, pool, cb) {
    pool.query(`
        SELECT
            '${name}'                   AS text,
            _text                       AS _text,
            number                      AS number,
            ST_AsText(ST_collect(geom)) AS geom
        FROM (
            SELECT
                MAX(_text)                                  AS _text,
                ST_ClusterWithin(geom, 0.1)                 AS geom,
                array_to_string(array_agg(number), ',')     AS number
            FROM address
            WHERE text = '${name}'
        ) f;
    `, function(err, res) {
        if (err) return cb(err);

        var numbers = res.rows[0].number.split(',');
        var geom = wk.parse(res.rows[0].geom);
        var text = res.rows[0].text;
        var _text = res.rows[0]._text;

        var number_it = 0;

        var query = 'BEGIN;'

        for (var f_it = 0; f_it < geom.geometries.length; f_it++) {
            var feat = geom.geometries[f_it];

            var num = [];
            var multi = [];
            for (pt_it = 0; pt_it < feat.geometries.length; pt_it++) {
                num.push(numbers[number_it]);
                number_it++;
                multi.push(feat.geometries[pt_it].coordinates);
            }

            var mGeom = turf.multiPoint(multi).geometry;

            query = query + `INSERT INTO address_cluster (text, _text, number, geom) VALUES ('${text}', '${_text}', '${num.join(',')}', ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(mGeom)}'), 4326));`
        }

        query = query + 'COMMIT;'

        pool.query(query, function(err, res) {
            return cb(err);
        });
    });
}

function network(name, pool, cb) {
    pool.query(`
        SELECT
            '${name}'                       AS text,
            _text                           AS _text,
            ST_AsText(ST_collect(geom))     AS geom
        FROM (
            SELECT
                MAX(_text)                      AS _text,
                ST_ClusterWithin(geom, 0.1)     AS geom
            FROM network
            WHERE text = '${name}'
        ) f;
    `, function(err, res) {
        if (err) return cb(err);

        var geom = wk.parse(res.rows[0].geom);
        var text = res.rows[0].text;
        var _text = res.rows[0]._text;

        var query = 'BEGIN;'

        for (var f_it = 0; f_it < geom.geometries.length; f_it++) {
            var feat = geom.geometries[f_it];

            var multi = [];
            for (pt_it = 0; pt_it < feat.geometries.length; pt_it++) {
                multi.push(feat.geometries[pt_it].coordinates);
            }

            var mGeom = turf.multiLineString(multi).geometry;

            query = query + `INSERT INTO network_cluster (text, _text, geom) VALUES ('${text}', '${_text}', ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(mGeom)}'), 4326));`
        }

        query = query + 'COMMIT;'

        pool.query(query, function(err, res) {
            return cb(err);
        });
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
    `, function(err, res) {
        if (err) return cb(err);

        if (!res.rows.length) return cb();

        var address = linker(freq, {
            id: id,
            text: res.rows[0].network.split(' ')
        }, res.rows)

        if (!address) return cb();

        pool.query(`
            UPDATE network_cluster
            SET address = ${address.id}
            WHERE network_cluster.id = ${id};
        `, function(err, res) {
            return cb(err);
        });
    });
}

function name(id, pool, cb) {
    pool.query(`SELECT ST_AsGeoJSON(geom) AS geom FROM network WHERE id = ${id}`, function(err, res) {
        if (err) return cb(err);

        var str = JSON.parse(res.rows[0].geom);

        var buff = buffer(str, 0.1).geometry;

        var names = {};

        pool.query(`SELECT text, _text FROM address WHERE ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(buff)}'), 4326))`, function(err, res) {
            if (err) return cb(err);

            for (res_it = 0; res_it < res.rows.length; res_it++) {
                var text = JSON.stringify([
                    res.rows[res_it].text,
                    res.rows[res_it]._text
                ]);

                if (!names[text]) names[text] = 1;
                else names[text]++;
            }

            var str = Object.keys(names);

            str.sort(function(a, b) {
                return names[b] - names[a];
            });

            if (!str.length) return cb();

            var text = JSON.parse(str[0]);

            pool.query(`
                UPDATE
                    network
                SET
                    text = '${text[0]}',
                    _text = '${text[1]}',
                    named = TRUE
                WHERE
                    id = ${id}
            `, function(err, res) {
                return cb(err);
            });
        });
    });
}
