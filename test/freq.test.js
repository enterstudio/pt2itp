var freq = require('../lib/freq');
var turf = require('@turf/turf');
var test = require('tape');

test('freq', function(t) {

    var feats = [
        ['main', 'street', 'se'],
        ['main', 'street', 'sw'],
        ['stanley', 'road', 'ne']
    ];

    var res = freq(feats, feats);

    t.deepEqual(res, { _max: 4, _min: 1, main: 1, ne: 2, road: 2, se: 2, stanley: 2, street: 1, sw: 2 }, 'test result');
    t.end();
});

