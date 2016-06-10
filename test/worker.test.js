var worker = require('../lib/worker');
var test = require('tape');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var addresses = require('./fixtures/addresses.json');
var streets = require('./fixtures/streets.json');

test('worker - dump raw', function(t) {
    worker({
        Addresses: { addresses: addresses },
        Streets: { streets: streets }
    }, [3789,2373,12], null, function(err, res) {
        t.equal(res.toString(), 'No street data in: 1,1,14');
        t.end();    
    });
});
