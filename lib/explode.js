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
                console.log(working[0] === coords[0])
                if (_.isEqual(working[0],coords[0])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1).reverse().concat(working);
                    line_it = 0;
                } else if (_.isEqual(working[0],coords[coords.length-1])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1).concat(working);
                    line_it = 0;
                } else if (_.isEqual(working[working.length-1],coords[0])) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1));
                    line_it = 0;
                } else if (_.isEqual(working[working.length-1],coords[coords.length-1])) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1).reverse());
                }
            }
            results.features.push(turf.linestring(working));
        }
    }
    return results;
}
