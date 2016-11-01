var test = require('tape');
var cluster = require('../lib/cluster');
var fs = require('fs');
var pg = require('pg');
var Queue = require('d3-queue').queue;

var pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 30000
});

test('cluster.name', function(t) {
    var popQ = Queue(1);

    //CREATE pt2itp TABLES
    popQ.defer(function(done) {
        pool.query(`
            BEGIN;
            CREATE TABLE address (id SERIAL, text TEXT, _text TEXT, number INT, geom GEOMETRY(POINT, 4326));
            CREATE TABLE address_cluster (id SERIAL, text TEXT, _text TEXT, number TEXT, geom GEOMETRY(MULTIPOINT, 4326));
            CREATE TABLE network (id SERIAL, text TEXT, _text TEXT, named BOOLEAN, geom GEOMETRY(LINESTRING, 4326));
            CREATE TABLE network_cluster (id SERIAL, text TEXT, _text TEXT, address INT, geom GEOMETRY(MULTILINESTRING, 4326));
            COMMIT;
        `, function(err, res) {
            t.error(err);
            return done();
        });
    });

    //POPULATE NETWORK
    popQ.defer(function(done) {
        pool.query(`
            BEGIN;
            INSERT INTO network (id, geom) VALUES (1, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "LineString", "coordinates": [ [ -66.05180561542511, 45.26869136632906 ], [ -66.05007290840149, 45.268982070325656 ] ] }'), 4326));
            COMMIT;
        `, function(err, res) {
            t.error(err);
            return done();
        });
    });

    //POPULATE ADDRESS
    popQ.defer(function(done) {
        pool.query(`
            BEGIN;
            INSERT INTO address (id, text, _text, number, geom) VALUES (1, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326));
            INSERT INTO address (id, text, _text, number, geom) VALUES (2, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05125308036804, 45.26868759094269 ] }'), 4326));
            INSERT INTO address (id, text, _text, number, geom) VALUES (3, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05092048645020, 45.26872912017898 ] }'), 4326));
            INSERT INTO address (id, text, _text, number, geom) VALUES (4, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05050742626190, 45.26880462780347 ] }'), 4326));
            COMMIT;
        `, function(err, res) {
            t.error(err);
            return done();
        });
    });

    popQ.defer(function(done) {
        cluster.name(1, pool, function(err) {
            t.error(err);
            return done();
        });
    });

    popQ.defer(function(done) {
        pool.query(`
            SELECT id, _text, text, named FROM network;
        `, function(err, res) {
            t.error(err);

            t.deepEquals(res.rows[0], {
                id: 1,
                _text: 'Main Street',
                text: 'main st',
                named: true
            });
            return done();
        });
    });

    popQ.await(function(err) {
        t.error(err);

        pool.query(`
            BEGIN;
            DROP TABLE address;
            DROP TABLE address_cluster;
            DROP TABLE network;
            DROP TABLE network_cluster;
            COMMIT;
        `, function(err, res) {
            t.error(err);
            t.end();
        });
    });
});

test('cluster.match', function(t) {
    t.end();
});

test('cluster.address', function(t) {
    t.end();
});

test('cluster.network', function(t) {
    t.end();
});

test('end connection', function(t) {
    pool.end();
    t.end();
});
