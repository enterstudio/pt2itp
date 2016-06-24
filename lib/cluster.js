module.exports = cluster;
module.exports.closestCluster = closestCluster;

var turf = require('turf');
var buffer = require('./buffer');
var _ = require('lodash');

//Accepts a feature collection and outputs
//FeatureCollections of MultiPoint geometries - one for each identically named road
function cluster(feats) {
    var featMap = {};
    var namedCluster = {
        type: 'FeatureCollection',
        features: []
    }
    var unnamedCluster = {
        type: 'FeatureCollection',
        features: []
    }

    for (var i = 0; i < feats.features.length; i++) {
        var street = feats.features[i].properties.street;

        if (!street || street.length === 0) {
            unnamedCluster.features.push(feats.features[i]);
        } else if (featMap[street]) {
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
                    "carmen:text": featMap[streets[i]][0].properties['carmen:text'],
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
            var feat = turf.combine(turf.featureCollection(featMap[streets[i]]))
            if (feat.type === 'FeatureCollection') feat = feat.features[0];
            feat.properties.street = featMap[streets[i]][0].properties.street

            if (feat.properties.street.length === 0) {
                feat.properties['carmen:text'] = '';
            } else {
                feat.properties['carmen:text'] = featMap[streets[i]][0].properties['carmen:text']
            }
        }

        namedCluster.features.push(feat);
    }

    return {
        named: namedCluster,
        unnamed: unnamedCluster
    }
}

function closestCluster(str, addresses) {
    if (str.geometry.type !== 'LineString') return null; //I only deal with linestrings

    //Don't really like circles either
    if (_.isEqual(str.geometry.coordinates[0], str.geometry.coordinates[str.geometry.coordinates.length-1])) return null;

    var closest = [];

    var buff = buffer(str, 0.1);
    var within = { type: 'FeatureCollection', features: [] };

    for (var addrs_it = 0; addrs_it < addresses.features.length; addrs_it++) {
        var addr = addresses.features[addrs_it];

        var pts = addr.geometry.coordinates.filter(function(pt) {
            return turf.inside(turf.point(pt), buff);
        });
        within.features.push(turf.multipoint(pts, addr.properties));
    }
}
