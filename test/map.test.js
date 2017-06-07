const worker = require('../lib/map');
const test = require('tape');
const path = require('path');
const fs = require('fs');
const pg = require('pg');

test('map - in-address error', (t) => {
    worker({
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --in-address=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - in-network error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --in-network=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - output error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --output=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - db error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        'output': '/tmp/itp.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --db=<DATABASE> argument required');
        t.end();
    });
});

test('map - good run', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        'output': '/tmp/itp.geojson',
        'db': 'pt_test'
    }, (err, res) => {
        t.error(err);
        t.end();
    });
});

test('drop database', (t) => {
    let pool = new pg.Pool({
        max: 10,
        user: 'postgres',
        database: 'pt_test',
        idleTimeoutMillis: 30000
    });

    pool.query(`
        BEGIN;
        DROP TABLE address;
        DROP TABLE address_cluster;
        DROP TABLE network;
        DROP TABLE network_cluster;
        COMMIT;
    `, (err) => {
        t.error(err);
        pool.end();
        t.end();
    });
});
