module.exports = cluster;

var turf = require('turf');

//Accepts a feature collection and outputs 
//FeatureCollections of MultiPoint geometries - one for each identically named road
function cluster(feats) {
    var featMap = {};
    var featCluster = {
        type: 'FeatureCollection',
        features: []
    }

    for (var i = 0; i < feats.features.length; i++) {
        var street = feats.features[i].properties.street;
        if (featMap[street]) {
            featMap[street].push(feats.features[i]);
        } else {
            featMap[street] = [];
            featMap[street].push(feats.features[i]);
        }
    }

    var streets = Object.keys(featMap);
    for (var i = 0; i < streets.length; i++) {
        if (featMap[streets[i]][0].geometry.type === "Point") {
            var feat = {
                "type": "Feature",
                "properties": {
                    "street": featMap[streets[i]][0].properties.street,
                    "numbers": []
                },
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": []
                }
            }
            for (var j = 0; j < featMap[streets[i]].length; j++) {
                feat.properties.numbers.push(parseInt(featMap[streets[i]][j].properties.number));
                feat.geometry.coordinates.push(featMap[streets[i]][j].geometry.coordinates);
            }
        } else { //LineStrings
            var feat = turf.combine(turf.featurecollection(featMap[streets[i]]))
            if (feat.type === 'FeatureCollection') feat = feat.features[0];
            feat.properties.street = featMap[streets[i]][0].properties.street
            feat.properties['carmen:text'] = featMap[streets[i]][0].properties['carmen:text']
        }

        featCluster.features.push(feat);
    }

    return featCluster;
}
