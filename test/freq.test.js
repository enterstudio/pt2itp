var freq = require('../lib/freq');
var turf = require('turf');
var test = require('tape');

test('freq', function(t) {

    var feats = [
        ['main', 'street', 'se'],
        ['main', 'street', 'sw'],
        ['stanley', 'road', 'ne']
    ].map(function(street) {
        return turf.point([0,0], {
            street: street
        });
    })
    var feats = turf.featurecollection(feats);
    
    var res = freq(feats, feats);

    t.deepEqual(res, { _max: 1, _min: 4, main: 0.25, ne: 0.5, road: 0.5, se: 0.5, stanley: 0.5, street: 0.25, sw: 0.5 }, 'test result');
    t.end();
});

