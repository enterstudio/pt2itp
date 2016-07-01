var test = require('tape');
var cluster = require('../lib/cluster');
var fs = require('fs');

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

    var res = cluster(feat);

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
                street: 'Test Street',
                alternates: []
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: 'Test Street',
                alternates: []
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: null,
                alternates: []
            },
            geometry: {
                type: 'LineString'
            }
        },{
            properties: {
                street: null,
                alternates: []
            },
            geometry: {
                type: 'LineString'
            }
        }]
    }

    var res = cluster(feat);

    t.equal(res.named.features.length, 1, 'produces 1 named feature');
    t.equal(res.named.features[0].properties.street, 'Test Street');

    t.equal(res.unnamed.features.length, 2, 'produces 2 unnamed features');
    t.equal(res.unnamed.features[0].properties.street, null);
    t.equal(res.unnamed.features[1].properties.street, null);

    t.end();
});

test('closestCluster', function(t) {
    t.test('closestCluster - Straight Line', function(q) {
        var res = cluster.closestCluster({
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": [ [ 152.9567563533783, -27.291505832532188 ], [ 152.95727133750913, -27.288550080213408 ] ] 
            }
        },{
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "street": "Main Street"
                },
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [
                        [ 152.9564130306244, -27.2910863111871 ],
                        [ 152.95650959014893, -27.290428422250013 ],
                        [ 152.9566490650177, -27.2897514599999 ],
                        [ 152.95678853988645, -27.289036354549673 ],
                    ]
                }
            },{
                "type": "Feature",
                "properties": {
                    "street": "Other Avenue"
                },
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [ 
                        [ 152.95779705047605, -27.28927472354469 ],
                        [ 152.95770049095154, -27.289579835111777 ],
                        [ 152.95766830444336, -27.289884945840623 ]
                    ]
                }
            }]
        });

        if (process.env.UPDATE) {
            fs.writeFileSync(__dirname + '/fixtures/cluster.simple.json', JSON.stringify(res, null, 4));
            t.fail('had to update fixture');
        }

        var fixture = require('./fixtures/cluster.simple.json');
        q.deepEquals(res, fixture);
        q.end();
    });
});
