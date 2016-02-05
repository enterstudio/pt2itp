turf = require('turf');
_ = require('lodash');

/**
 * Accepts a feature collection of MultiLineStrings - one for each identically named street.
 * It then lines them up in the array so the start and end of each segment are adjacent
 * and where there is no end=>beginning match it splits it into a separate MultiLineString
 */
module.exports = function(streets) {
    var results = {
        type: 'FeaturesCollection',
        features: []
    }

    //Iterate through each MultiLineString - each should be a uniquely named street
    for (var feat_it = 0; feat_it < streets.features.length; feat_it++) {
        if (streets.features[feat_it].geometry.type !== 'MultiLineString') {
            results.features.push(streets.features[feat_it]);
        } else if (streets.features[feat_it].geometry.coordinates.length === 1) {
            results.features.push(streets.features[feat_it]);
        } else {
            //Get the first LineString segment of the multi and set it as the working copy
            var working = streets.features[feat_it].geometry.coordinates.splice(0,1)[0];
    
            //Iterate through all of the remaining features to find adjacent LineStrings
            for (line_it = 0; line_it < streets.features[feat_it].geometry.coordinates.length; line_it++) {
                //Coords for current tmp LineString being inspected
                var coords = streets.features[feat_it].geometry.coordinates[line_it];

                // <-c- . -w->
                if (_.isEqual(working[0],coords[0])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].reverse().concat(working);
                    line_it = -1;

                // -c-> . -w->
                } else if (_.isEqual(working[0],coords[coords.length-1])) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].concat(working);
                    line_it = -1;

                // -w-> . -c->
                } else if (_.isEqual(working[working.length-1],coords[0])) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0]);
                    line_it = -1;

                // -w-> . <-c-
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
