test = require('tape');
explode = require('../lib/explode');

test('explode', function(t) {
    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": [1,1]
            }
        }]
    }).features[0].geometry.coordinates,  [ 1, 1 ] , 'Non linestrings are ignored');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[0,1]], [[0,1],[1,1]]]
            }
        }]
    }, 100).features[0].geometry.coordinates,  [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ] ], '90 deg angle');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[0,1]], [[0,1],[1,1]]]
            }
        }]
    }, 30).features[0].geometry.coordinates, [ [ 0, 0 ], [ 0, 1 ] ], '90 deg angle cutoff');

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
    }).features[0].geometry.coordinates,  [ [ 0, 0 ], [ 1, 1 ] ] , '-1->');

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
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-1-> -2->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]], [[-1,-1],[0,0]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-2-> -1->');

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
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-1-> <-2-');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[1,1],[0,0]], [[-1,-1],[0,0]]]
            }
        }]
    }).features[0].geometry.coordinates, [[1,1],[0,0],[-1,-1 ]], '-2-> <-1-');

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

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[3,3], [2,2]], [[4,4], [3,3]]]
            }
        }]
    }).features[0].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ] ], '<-1- <-2-');

    var res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[4,4],[3,3]], [[3,3],[2,2]]]
            }
        }]
    });
    t.pass('<-2- <-1-');
    t.deepEquals(res.features[0].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ] ]);
    t.deepEquals(res.features.length, 1);

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
    t.pass('-1-> -3->   <-2- <-4-');
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -1, -1 ], [ 0, 0 ], [ 1, 1 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ]]);
    t.deepEquals(res.features.length, 2);

    //Don't connect where divided highways meet or else you can get odds and evens on the same side
    var res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [
                    [ [ -66.15374565124512, 45.24081084565751 ], [ -66.15177154541016, 45.23967766228492 ], [ -66.15009784698486, 45.23816671596496 ], [ -66.14908933639526, 45.236489518498345 ], [ -66.14827394485474, 45.23441939571161 ] ],
                    [ [ -66.15344524383545, 45.241203677284545 ], [ -66.15202903747559, 45.24032735684951 ], [ -66.15102052688599, 45.23963233447991 ], [ -66.14992618560791, 45.23855956587336 ], [ -66.14919662475586, 45.23730545858455 ], [ -66.1483383178711, 45.23499359791086 ], [ -66.14827394485474, 45.23441939571161 ] ]
                ]
            }
        }]
    });
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -66.15374565124512, 45.24081084565751 ], [ -66.15177154541016, 45.23967766228492 ], [ -66.15009784698486, 45.23816671596496 ], [ -66.14908933639526, 45.236489518498345 ], [ -66.14827394485474, 45.23441939571161 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ -66.15344524383545, 45.241203677284545 ], [ -66.15202903747559, 45.24032735684951 ], [ -66.15102052688599, 45.23963233447991 ], [ -66.14992618560791, 45.23855956587336 ], [ -66.14919662475586, 45.23730545858455 ], [ -66.1483383178711, 45.23499359791086 ], [ -66.14827394485474, 45.23441939571161 ] ]);
    t.deepEquals(res.features.length, 2);

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
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '<-2- -1->');

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
    }).features[0].geometry.coordinates, [[1,1,], [0,0], [-1,-1]], '<-1- -2->');

    t.end();
});
