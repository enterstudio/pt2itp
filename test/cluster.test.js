var test = require('tape');
var clusterAddress = require('../lib/cluster');

test('cluster', function(t) {
    var feat  = {
        type: 'FeatureCollection',
        features: [{
            properties: {
                street: 'Test Street',
                number: 10
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        },{
            properties: {
                street: 'Test Street',
                number: '12'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }]
    }

    var res = clusterAddress(feat);

    t.equal(res.features.length, 1, 'produces 1 feature');
    t.deepEquals(res.features[0].properties.numbers, [ 10, 12 ], 'produces address cluster');
    t.deepEquals(res.features[0].geometry.coordinates, [ [ 0, 0 ], [ 1, 1 ] ], 'produces multipoint');
    t.end();
});
