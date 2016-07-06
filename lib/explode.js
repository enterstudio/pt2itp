var intersection = require('intersection');
var turf = require('turf');
var _ = require('lodash');

module.exports = main;
module.exports.hasIntersect = hasIntersect;
module.exports.dedup = dedup;
module.exports.btn = btn;

/**
 * Accepts a feature collection of MultiLineStrings - one for each identically named street.
 * It then lines them up in the array so the start and end of each segment are adjacent
 * and where there is no end=>beginning match it splits it into a separate MultiLineString
 *
 * degTolerance is the max angle between segments that can be matched. Default 45deg.
 */

function main(streets, degTolerance) {
    var results = {
        type: 'FeaturesCollection',
        features: []
    }

    if (!degTolerance) var degTolerance = 45;

    //Iterate through each MultiLineString - each should be a uniquely named street
    for (var feat_it = 0; feat_it < streets.features.length; feat_it++) {
        if (streets.features[feat_it].geometry.type !== 'MultiLineString') {
            results.features.push(streets.features[feat_it]);
        } else if (streets.features[feat_it].geometry.coordinates.length === 1) {
            results.features.push(turf.lineString(streets.features[feat_it].geometry.coordinates[0], streets.features[feat_it].properties));
        } else {
            //Get the first LineString segment of the multi and set it as the working copy
            var working = streets.features[feat_it].geometry.coordinates.splice(0,1)[0];

            //Iterate through all of the remaining features to find adjacent LineStrings
            for (line_it = 0; line_it < streets.features[feat_it].geometry.coordinates.length; line_it++) {
                //Coords for current tmp LineString being inspected
                var coords = streets.features[feat_it].geometry.coordinates[line_it];


                //Working start / Working end bearing
                var wsBearing = turf.bearing(turf.point(working[0]), turf.point(working[1]));
                var weBearing = turf.bearing(turf.point(working[working.length - 2]), turf.point(working[working.length - 1]));

                //Coords start / Coords end bearing
                var csBearing = turf.bearing(turf.point(coords[0]), turf.point(coords[1]));
                //Bearing of last segment of coords line
                var ceBearing = turf.bearing(turf.point(coords[coords.length - 2]), turf.point(coords[coords.length - 1]));

                var intersects = hasIntersect(working, coords);

                // <-c- . -w-> && <-w- . -c->
                if (_.isEqual(working[0],coords[0]) && !intersects && ( wsBearing > 0 ?
                    btn(csBearing + 180, wsBearing,  degTolerance) :
                    btn(csBearing - 180, wsBearing, degTolerance)
                )){
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].reverse().concat(working);
                    line_it = -1;

                // -c-> . -w-> && <-w- . <-c-
                } else if (_.isEqual(working[0],coords[coords.length-1]) && !intersects && btn(ceBearing, wsBearing, degTolerance)) {
                    working = streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].concat(working);
                    line_it = -1;

                // -w-> . -c-> && <-c- . <-w-
                } else if (_.isEqual(working[working.length-1],coords[0]) && !intersects && btn(csBearing, weBearing, degTolerance)) {
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0]);
                    line_it = -1;

                // -w-> . <-c- && -c-> . <-w-
                } else if (_.isEqual(working[working.length-1],coords[coords.length-1]) && !intersects && ( weBearing > 0 ?
                    btn(ceBearing + 180, weBearing, degTolerance) :
                    btn(ceBearing - 180, weBearing, degTolerance)
                )){
                    working = working.concat(streets.features[feat_it].geometry.coordinates.splice(line_it, 1)[0].reverse());
                    line_it = -1;
                }

                //line_it is the last segment in the MultiLineString
                if (line_it === streets.features[feat_it].geometry.coordinates.length - 1) {
                    results.features.push(turf.lineString(dedup(working), streets.features[feat_it].properties));

                    if (streets.features[feat_it].geometry.coordinates.length !== 0) {
                        working = streets.features[feat_it].geometry.coordinates.splice(0,1)[0];

                        if (streets.features[feat_it].geometry.coordinates.length === 0) {
                            results.features.push(turf.lineString(dedup(working), streets.features[feat_it].properties));
                        } else {
                            line_it = -1;
                        }
                    }
                }
            }
        }
    }

    return results;
}

function hasIntersect(working, coords) {
    //Don't Allow self intersections
    for (var w_it = 0; w_it < working.length - 1; w_it++) {
        for (var c_it = 0; c_it < coords.length - 1; c_it++) {
            var intersects = intersection.intersect(
                { start: { x: coords[c_it][0],  y: coords[c_it][1] },  end:{ x: coords[c_it+1][0], y: coords[c_it+1][1]   } },
                { start: { x: working[w_it][0], y: working[w_it][1] }, end:{ x: working[w_it+1][0], y: working[w_it+1][1] } }
            );
            if (intersects) break;
        }
        if (intersects) break;
    }

    if (intersects.x === working[0][0] && intersects.y === working[0][1]) return false;
    if (intersects.x === working[working.length - 1][0] && intersects.y === working[working.length - 1][1]) return false;
    return intersects;
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

//n - Angle to test
//wDeg - Degree to test against
//tol  - Tolerance value
function btn(n, wDeg, tol) {
    a = wDeg - tol;
    b = wDeg + tol;

    n = (360 + (n % 360)) % 360;
    a = (3600000 + a) % 360;
    b = (3600000 + b) % 360;

    if (a < b) return a <= n && n <= b;
    return a <= n || n <= b;
}
