var name = require('../lib/name');
var test = require('tape');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var addresses = require('./fixtures/addresses.json');
var streets = require('./fixtures/streets.json');

test('name - dump raw addresses', function(t) {
    global.mapOptions = {
        raw: 'addresses'
    };

    var i = 0;

    name({
        Addresses: { addresses: addresses },
        Streets: { streets: streets }
    }, [3789,2373,12], writeData, function(err, res) {
        t.end();    
    });

    function writeData(data) {
        t.deepEquals(JSON.parse(data), addresses.features[i], 'addr ' + i + ' has equality');
        i = i + 1;
    }
});

test('name - dump raw streets', function(t) {
    global.mapOptions = {
        raw: 'streets'
    };

    var i = 0;

    name({
        Addresses: { addresses: addresses },
        Streets: { streets: streets }
    }, [3789,2373,12], writeData, function(err, res) {
        t.end();    
    });

    function writeData(data) {
        t.deepEquals(JSON.parse(data), streets.features[i], 'street ' + i + ' has equality');
        i = i + 1;
    }
});
