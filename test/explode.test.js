test = require('tape');
explode = require('../lib/explode');

test('explode', function(t) {
    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]]]
            }
        }]
    }).features[0].geometry.coordinates, [ [ [ 0, 0 ], [ 1, 1 ] ] ], '-->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]],[[0,0],[-1,-1]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '<-- -->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[0,0],[1,1]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '--> -->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[1,1],[0,0]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '--> <--');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[-1,-1]],[[0,0],[1,1]]]
            }
        }]
    }).features[0].geometry.coordinates, [[1,1,], [0,0], [-1,-1]], '<-- <--');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[2,2], [1,1]],[[0,0],[1,1]], [[3,3], [2,2]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1],[2,2],[3,3]], '-1-> -3-> <-2- <-4-');

    var res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[3,3], [2,2]],[[0,0],[1,1]], [[4,4], [3,3]]]
            }
        }]
    });
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -1, -1 ], [ 0, 0 ], [ 1, 1 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ]]);

t.end();
});
