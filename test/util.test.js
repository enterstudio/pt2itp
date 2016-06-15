var util = require('../lib/util');
var test = require('tape');

test('Util - bad xy', function(t) {
    util({
        xy: ',,,',
        zoom: 12
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --xy must be in format --xy <x,y>');
        t.end();
    });
});

test('Util - bad coords', function(t) {
    util({
        coords: ',,,',
        zoom: 12
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --coords must be in format --coords <lng,lat>');
        t.end();
    });
});

test('Util - no xy & coords together', function(t) {
    util({
        coords: ',,,',
        xy: ',,,',
        zoom: 12
    }, function(err, res) {
        t.equals(err.toString(), 'Error: --xy and --coords cannot be used together');
        t.end();
    });
});

test('Util - xy & zoom', function(t) {
    util({
        xy: '0,0',
        zoom: 1
    }, function(err, res) {
        t.error(err);
        t.deepEquals(res, '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-180,0],[-180,85.0511287798066],[0,85.0511287798066],[0,0],[-180,0]]]}}');
        t.end();
    });
});

test('Util - coords & zoom', function(t) {
    util({
        coords: '13.15,-0.22',
        zoom: 1 
    }, function(err, res) {
        t.error(err);
        t.deepEquals(res, '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[0,-85.0511287798066],[0,0],[180,0],[180,-85.0511287798066],[0,-85.0511287798066]]]}}');
        t.end();
    });
});
