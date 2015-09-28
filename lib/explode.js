turf = require('turf');
_ = require('lodash');

/**
 * Combine or explode street
 */
module.exports = function(streets) {
    var results = {
        type: 'FeaturesCollection',
        features: []
    }
    for (var feat_it = 0; feat_it < streets.features.length; feat_it++) {
        if (streets.features[feat_it].geometry.type !== 'MultiLineString') {
            results.features.push(streets.features[feat_it]);
        } else {
            var working = streets.features[feat_it].geometry.coordinates.splice(0,1)[0];
            for (line_it = 0; line_it < streets.features[feat_it].geometry.coordinates.length; line_it++) {
                var coords = streets.features[feat_it].geometry.coordinates[line_it];
                if (_.isEqual(working[0],coords[0])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].reverse().concat(working);
                    line_it = -1;
                } else if (_.isEqual(working[0],coords[coords.length-1])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].concat(working);
                    line_it = -1;
                } else if (_.isEqual(working[working.length-1],coords[0])) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0]);
                    line_it = -1;
                } else if (_.isEqual(working[working.length-1],coords[coords.length-1])) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].reverse());
                    line_it = -1;
                }
                if (line_it === streets.features[feat_it].geometry.coordinates.length - 1) {
                    results.features.push(turf.linestring(dedup(working), streets.features[feat_it].properties));
                    
                    working = streets.features[feat_it].geometry.coordinates.splice(0,1)[0];

                    if (streets.features[feat_it].geometry.coordinates.length !== 0) {
                        line_it = -1;
                    }
                }
            }
        }
    }
    return results;
}

function dedup(coords) {
    var processed = [];
    for (var i = 0 ; i < coords.length; i++) {
        if (! _.isEqual(coords[i], coords[i+1])) {
           processed.push(coords[i]);
        }
    }
    return processed;
}
