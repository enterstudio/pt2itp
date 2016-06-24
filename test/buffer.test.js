var test = require('tape');
var buffer = require('../lib/buffer');

test('Not LineString', function(t) {
    t.throws(function () {
        buffer({
            type: 'Point'
        }, 1);
    });
    t.end();
});

test('Feature Not LineString', function(t) {
    t.throws(function () {
        buffer({
            type: 'Feature',
            geometry: {
                type: 'Point'
            }
        }, 1);
    });
    t.end();
});

test('Simple Buffer', function(t) {
    var res = buffer({
        type: 'LineString',
        coordinates: [ [ 153.02594661712646, -27.391440164073067 ], [ 153.0263113975525, -27.389068173784242 ] ]
    }, 0.1);
    t.end();
});
