module.exports.name = name;
module.exports.match = match;
module.exports.address = address;
module.exports.network = network;

const buffer = require('./buffer');
const linker = require('./linker');

const turf = require('@turf/turf');
const _ = require('lodash');
const wk = require('wellknown');

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
    `, (err, res) => {
        if (err) return cb(err);

        let numbers = res.rows[0].number.split(',');
        let geom = wk.parse(res.rows[0].geom);
        let text = res.rows[0].text;
        let _text = res.rows[0]._text;

        let number_it = 0;

        let query = 'BEGIN;'

        for (let f_it = 0; f_it < geom.geometries.length; f_it++) {
            let feat = geom.geometries[f_it];

            let num = [];
            let multi = [];
            for (pt_it = 0; pt_it < feat.geometries.length; pt_it++) {
                num.push(numbers[number_it]);
                number_it++;
                multi.push(feat.geometries[pt_it].coordinates);
            }

            let mGeom = turf.multiPoint(multi).geometry;

            query = query + `INSERT INTO address_cluster (text, _text, number, geom) VALUES ('${text}', '${_text}', '${num.join(',')}', ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(mGeom)}'), 4326));`
        }

        query = query + 'COMMIT;'

        pool.query(query, (err, res) => {
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
    `, (err, res) => {
        if (err) return cb(err);

        let geom = wk.parse(res.rows[0].geom);
        let text = res.rows[0].text;
        let _text = res.rows[0]._text;

        let query = 'BEGIN;'

        for (let f_it = 0; f_it < geom.geometries.length; f_it++) {
            let feat = geom.geometries[f_it];

            let multi = [];
            for (pt_it = 0; pt_it < feat.geometries.length; pt_it++) {
                multi.push(feat.geometries[pt_it].coordinates);
            }

            let mGeom = turf.multiLineString(multi).geometry;

            query = query + `INSERT INTO network_cluster (text, _text, geom) VALUES ('${text}', '${_text}', ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(mGeom)}'), 4326));`
        }

        query = query + 'COMMIT;'

        pool.query(query, (err, res) => {
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
