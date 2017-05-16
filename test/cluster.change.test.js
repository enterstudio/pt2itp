const Cluster = require('../lib/cluster');

const test = require('tape');
const fs = require('fs');
const pg = require('pg');
const Queue = require('d3-queue').queue;

const pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 30000
});

const cluster = new Cluster(pool);

test('Populate and cluster address points', (t) => {
    const popQ = Queue(1);

    //CREATE pt2itp TABLES
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            DROP TABLE IF EXISTS address;
            DROP TABLE IF EXISTS address_cluster;
            DROP TABLE IF EXISTS network;
            DROP TABLE IF EXISTS network_cluster;
            CREATE TABLE address (id SERIAL, text TEXT, _text TEXT, number INT, geom GEOMETRY(POINT, 4326));
            CREATE TABLE address_cluster (id SERIAL, text TEXT, _text TEXT, number TEXT, geom GEOMETRY(MULTIPOINT, 4326));
            CREATE TABLE network (id SERIAL, text TEXT, _text TEXT, named BOOLEAN, geom GEOMETRY(LINESTRING, 4326));
            CREATE TABLE network_cluster (id SERIAL, text TEXT, _text TEXT, address INT, geom GEOMETRY(MULTILINESTRING, 4326), buffer GEOMETRY(POLYGON, 4326));
            COMMIT;
        `, (err, res) => {
            t.error(err);
            return done();
        });
    });

    //POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO address (id, text, _text, number, geom) VALUES (1, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point","coordinates": [ 9.51413869857788,47.132724392963944 ] }'), 4326));
            INSERT INTO address (id, text, _text, number, geom) VALUES (2, 'main st', 'Main Street', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point","coordinates": [ 9.516541957855225,47.132724392963944 ] }'), 4326));
            COMMIT;
        `, (err, res) => {
            t.error(err);
            return done();
        });
    });

    popQ.defer((done) => {
        cluster.address((err) => {
            t.error(err);
            return done();
        });
    });

    popQ.await((err) => {
        t.error(err);

        pool.query(`
            BEGIN;
            DROP TABLE network;
            DROP TABLE network_cluster;
            COMMIT;
        `, (err, res) => {
            t.error(err);
            t.end();
        });
    });
});
