var worker = require('../lib/worker');
var test = require('tape');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var addresses = require('./fixtures/addresses.json');
var streets = require('./fixtures/streets.json');

test('worker - dump raw', function(t) {
    global.mapOptions = {
        raw: 'addresses'
    };

    var i = 0;

    worker({
        Addresses: { addresses: addresses },
        Streets: { streets: streets }
    }, [3789,2373,12], writeData, function(err, res) {
        //t.deepEqual(res, addresses);
        t.end();    
    });

    function writeData(data) {
        t.deepEquals(data, addresses.features[i]);
        i = i + 1;
    }
});
