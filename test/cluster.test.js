var test = require('tape');
var clusterAddress = require('../lib/cluster');

test('named clusters', function(t) {
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

    t.equal(res.named.features.length, 1, 'produces 1 named feature');
    t.equal(res.unnamed.features.length, 0, 'produces 0 unnamed features');
    t.deepEquals(res.named.features[0].properties.numbers, [ 10, 12 ], 'produces address cluster');
    t.deepEquals(res.named.features[0].geometry.coordinates, [ [ 0, 0 ], [ 1, 1 ] ], 'produces multipoint');
    t.end();
});

test('cluster', function(t) {
    var feat  = {
        type: 'FeatureCollection',
        features: [{
            properties: {
                street: 'Test Street'
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: 'Test Street'
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: null
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: null
            },
            geometry: {
                type: 'LineString'
            }
        }]
    }

    var res = clusterAddress(feat);

    t.equal(res.named.features.length, 1, 'produces 1 named feature');
    t.equal(res.named.features[0].properties.street, 'Test Street');

    t.equal(res.unnamed.features.length, 2, 'produces 2 unnamed features');
    t.equal(res.unnamed.features[0].properties.street, null);
    t.equal(res.unnamed.features[1].properties.street, null);

    t.end();
});
