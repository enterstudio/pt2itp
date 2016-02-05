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
        var feat = turf.combine(turf.featurecollection(featMap[streets[i]]));
        featCluster.features.push(feat);
    }

    return featCluster;
}
