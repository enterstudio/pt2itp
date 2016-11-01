var worker = require('../lib/map');
var test = require('tape');
var path = require('path');
var fs = require('fs');
var pg = require('pg');

test('map - in-address error', function(t) {
    worker({
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --in-address=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - in-network error', function(t) {
    worker({
        'in-address': './test/fixtures/sg-address.geojson'
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --in-network=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - output error', function(t) {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson'
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --output=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - db error', function(t) {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        'output': '/tmp/itp.geojson'
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --db=<DATABASE> argument required');
        t.end();
    });
});

test('map - output error', function(t) {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        'output': '/tmp/itp.geojson',
        'db': 'pt_test'
    }, function(err, res) {
        t.error(err);
        t.end();
    });
});

test('drop database', function(t) {
    var pool = new pg.Pool({
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
    `, function(err) {
        t.error(err);
        t.end();
    });
});
