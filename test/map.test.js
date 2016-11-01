var worker = require('../lib/map');
var test = require('tape');
var path = require('path');
var fs = require('fs');

test('map', function(t) {
    worker({
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --in-address=<FILE.geojson> argument required');
        t.end();
    });
});

test('map', function(t) {
    worker({
        'in-address': './test/fixtures/sg-address.geojson'
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --in-address=<FILE.geojson> argument required');
        t.end();
    });
});

