module.exports = cluster;
module.exports.closestCluster = closestCluster;

var turf = require('turf');
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

    for (var addr_it = 0; addr_it < addresses.features.length; addr_it++) {
        var addr = addresses.features[addr_it];

        for (var pt_it = 0; pt_it < addr.geometry.coordinates.length; pt_it++) {
            var dist = turf.distance(
                turf.pointOnLine(str, turf.point(addr.geometry.coordinates[pt_it])),
                turf.point(addr.geometry.coordinates[pt_it]),
                'kilometers'
            );
            if (dist <= 0.200) { //I don't really care about addresses further away than this
                closest.push({
                    dist: dist,
                    pt: addr.geometry.coordinates[pt_it],
                    cluster: addr_it
                });
            }
        }
    }

    closest.sort(function(a, b) {
        return a.dist - b.dist;
    });

    if (closest.length > 0) {
        var current = closest[0].cluster;
        var res = [addresses.features[current]]
        for (var closest_it = 1; closest_it < closest.length; closest_it++) {
            if (current === closest[closest_it].cluster) continue;

            res.push(addresses.features[closest[closest_it].cluster]);
            break;
        }

        if (res[0]) res[0].properties['marker-color'] = '#008000';
        if (res[1]) res[1].properties['marker-color'] = '#003200';

        return res;
    } else {
        return null;
    }
}
