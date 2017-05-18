const Cluster = require('../lib/cluster');
const fs = require('fs');
const test = require('tape');
const pg = require('pg');
const Queue = require('d3-queue').queue;

const jsonFixture = require(__dirname + '/fixtures/cluster.address.json');

const pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 30000
});

const cluster = new Cluster(pool);

/*
- [ ] function to read all geojsons 
- [ ] function to run each with ST_AsGeoJSON
- [ ]
*/
function createClusteredGeojsons(jsonFixture){
    const popQ = Queue(1);
    const q1 = Queue(2);

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
            if (err) console.log(err);
            return done();
        });
    });

    //POPULATE ADDRESS
    jsonFixture.features.forEach(function(i) {
        popQ.defer((done) => {
            pool.query(`
                BEGIN;
                INSERT INTO address (id, text, _text, number, geom) VALUES (1, 'main st', 'Main Street', 10, ST_SetSRID('`ST_GeomFromGeoJSON(i[0]), 4326)`');
                INSERT INTO address (id, text, _text, number, geom) VALUES (2, 'main st', 'Main Street', 10, ST_SetSRID('`ST_GeomFromGeoJSON(i[1]), 4326)`');
                COMMIT;
            `, (err, res) => {
                if (err) console.log(err);
                return done();
                });
            });
        };
    });

    popQ.defer((done) => {
        cluster.address((err) => {
            if (err) console.log(err);
            return done();
        });
    });

    popQ.await((err) => {
        if (err) console.log(err);

        pool.query(`
            BEGIN;
            DROP TABLE network;
            DROP TABLE network_cluster;
            COMMIT;
        `, (err, res) => {
            if (err) console.log(err);
        });
    });
});
}


function createClusteredGeojsons(jsonFixture) {
    jsonFixture.features.forEach(function(i) {
            console.log(i[0], i[1]);
    });
}

test('end connection', (t) => {
    pool.end();
    t.end();
});
