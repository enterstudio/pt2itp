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
                "coordinates": [[[0,0],[1,1]],[[0,0],[-1,-1]]]
            }
        }]
    }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]]);


    t.end();

});
