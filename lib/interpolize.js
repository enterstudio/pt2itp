module.exports = interpolize;
module.exports.lsb = LSB;
module.exports.segment = segment;

const tilebelt = require('@mapbox/tilebelt');
const cover = require('@mapbox/tile-cover');
const turf = require('@turf/turf');
const _ = require('lodash');

const det2D = require('./misc').det2D;
const sign = require('./misc').sign

//Left Side binary - Returns 1 or 0 for which is the left side
function LSB(start, end) {
    return sign(det2D(
        start,
        end,
        turf.destination(
            turf.center(turf.lineString([start, end])),
            0.01,
            turf.bearing(turf.point(start), turf.point(end)) - 90,
            'miles').geometry.coordinates
        ));
}

function interpolize(street, address, argv) {
    if (!argv) throw new Error('argv required');
    if (!argv.zoom) throw new Error('argv.zoom required');

    let dist = []
    let streetDist = turf.lineDistance(street, 'kilometers');

    //Generate coorelation between every address and its position on the line
    for (let address_it = 0; address_it < address.geometry.coordinates.length; address_it++) {
        let linePt = turf.pointOnLine(street, turf.point(address.geometry.coordinates[address_it])); //Closest pt on line to addr

        let res = {
            'distOnLine': turf.lineDistance(turf.lineSlice(turf.point(street.geometry.coordinates[0]), linePt, street), 'kilometers'),
            'distFromOrigin': turf.distance(turf.point(street.geometry.coordinates[0]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'distFromEnd':  turf.distance(turf.point(street.geometry.coordinates[street.geometry.coordinates.length -1]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'geometry': address.geometry.coordinates[address_it],
            'number': address.properties.numbers[address_it],
            'side': null
        };

        let seg = segment(street, res.distOnLine, 'kilometers');
        res.side = sign(det2D(seg[0], seg[1], address.geometry.coordinates[address_it]));

        dist.push(res);
    }

    let leftSide = LSB(street.geometry.coordinates[0], street.geometry.coordinates[1])

    let distStart = _.cloneDeep(dist.sort((a, b) => {
        if (a.distOnLine !== 0 && b.distOnLine !== 0) { //Handle cases where both addresses are to the direct left/right of the line
            let distA = a.distOnLine + a.distFromOrigin;
            let distB = b.distOnLine + a.distFromOrigin;
            if (distA < distB) return -1;
            if (distA > distB) return 1;
            return 0;
        } else if (a.distOnLine === 0 && b.distOnLine !== 0) { //a is off the beginning of the line, b is l/r of the line
            return -1;
        } else if (b.distOnLine === 0 && a.distOnLine !== 0) { //b is off the beginning of the line, a is l/r of the line
            return 1;
        } else { //both a/b are off the end of the line
            return b.distFromOrigin - a.distFromOrigin;
        }
    }));

    let distEnd = _.cloneDeep(dist.sort((a, b) => {
        if ((streetDist - a.distOnLine) !== 0 && (streetDist - b.distOnLine) !== 0) { //Handle cases where both addresses are to the direct left/right of the line
            let distA = (streetDist - a.distOnLine) + a.distFromEnd;
            let distB = (streetDist - b.distOnLine) + a.distFromEnd;
            if (distA < distB) return -1;
            if (distA > distB) return 1;
            return 0;
        } else if ((streetDist - a.distOnLine) === 0 && (streetDist - b.distOnLine) !== 0) { //a is off the beginning of the line, b is l/r of the line
            return -1;
        } else if ((streetDist - b.distOnLine) === 0 && (streetDist - a.distOnLine) !== 0) { //b is off the beginning of the line, a is l/r of the line
            return 1;
        } else { //both a/b are off the end of the line
            return b.distFromEnd - a.distFromEnd;
        }
    }));

    let result = {
        parityl: null,
        lstart: null,
        lend: null,
        parityr: null,
        rstart: null,
        rend: null
    };

    //Calculate number of odd/even on each side
    let parity = {
        totall: 0,
        lo: 0,
        le: 0,
        totalr: 0,
        ro: 0,
        re: 0
    }

    dist.forEach((d) => {
        //Don't count addr off the end of the line in parity as if the road bends (past the line geom)
        //the l/r calc could be incorrect
        if (d.distFromOrigin !== 0 && (streetDist - d.distFromEnd) !== 0) {
            if (d.side === leftSide && d.number % 2 === 0) parity.le++;
            if (d.side === leftSide && d.number % 2 === 1) parity.lo++;
            if (d.side !== leftSide && d.number % 2 === 0) parity.re++;
            if (d.side !== leftSide && d.number % 2 === 1) parity.ro++;
        }
    });

    parity.totall = parity.lo + parity.le;
    parity.totalr = parity.ro + parity.re;

    //Calculate Start L/R Address
    for (let dist_it = 0; dist_it < distStart.length; dist_it++) {
        if (distStart[dist_it].distOnLine !== 0 && !result.lstart && distStart[dist_it].side === leftSide) {
            result.lstart = distStart[dist_it].number;
        } else if (distStart[dist_it].distOnLine !== 0 && !result.rstart && distStart[dist_it].side !== leftSide) {
            result.rstart = distStart[dist_it].number;
        } else {
            if (!result.lstart) {
                if (parity.lo > parity.le && distStart[dist_it].number % 2 == 1) {
                    result.lstart = distStart[dist_it].number;
                } else if (parity.le > parity.lo && distStart[dist_it].number % 2 == 0) {
                    result.lstart = distStart[dist_it].number;
                }
            }
            if (!result.rstart) {
                if (parity.ro > parity.re && distStart[dist_it].number % 2 == 1) {
                    result.rstart = distStart[dist_it].number;
                } else if (parity.re > parity.ro && distStart[dist_it].number % 2 == 0) {
                    result.rstart = distStart[dist_it].number;
                }
            }
        }
    }

    //Calculate End L/R Address
    for (let dist_it = 0; dist_it < distEnd.length; dist_it++) {
        if (distEnd[dist_it].distOnLine - streetDist !== 0 && !result.lend && distEnd[dist_it].side === leftSide) {
            result.lend = distEnd[dist_it].number;
        } else if (distEnd[dist_it].distOnLine - streetDist !== 0 && !result.rend && distEnd[dist_it].side !== leftSide) {
            result.rend = distEnd[dist_it].number;
        } else {
            if (!result.lend) {
                if (parity.lo > parity.le && distEnd[dist_it].number % 2 == 1) {
                    result.lend = distEnd[dist_it].number;
                } else if (parity.le > parity.lo && distEnd[dist_it].number % 2 == 0) {
                    result.lend = distEnd[dist_it].number;
                }
            }
            if (!result.rend) {
                if (parity.ro > parity.re && distEnd[dist_it].number % 2 == 1) {
                    result.rend = distEnd[dist_it].number;
                } else if (parity.re > parity.ro && distEnd[dist_it].number % 2 == 0) {
                    result.rend = distEnd[dist_it].number;
                }
            }
        }
    }

    let lparity, rparity;

    if (!result.rstart && result.rend) result.rstart = result.rend;
    if (!result.rend && result.rstart) result.rend = result.rstart;
    if (!result.lstart && result.lend) result.lstart = result.lend;
    if (!result.lend && result.lstart) result.lend = result.lstart;

    //Stores the actual matches start/end address - not the one normalized
    //if the start/end are not both odd or even
    let actualMatch = {
        rstart: result.rstart,
        rend: result.rend,
        lstart: result.lstart,
        lend: result.lend
    }

    if (result.rstart && result.rend) {
        if (parity.ro / parity.totalr > 0.70) rparity = 'O';
        if (parity.re / parity.totalr > 0.70) rparity = 'E';

        //At lease some parity is needed to make this work
        if (!rparity) {
            if (result.rstart % 2 === 0 && result.rend % 2 === 0) {
                rparity = 'E';
            } else if (result.rstart % 2 === 1 && result.rend % 2 === 1) {
                rparity = 'O';
            } else { //This is completely arbitrary - in the US odd are usually left/even right
                rparity = 'E';
            }
        }

        if (rparity === 'E') {
            if (result.rstart % 2 !== 0) {
                result.rstart++;
            }
            if (result.rend % 2 !== 0) {
                result.rend++;
            }
        } else {
            if (result.rstart % 2 !== 1) result.rstart++;
            if (result.rend % 2 !== 1) result.rend++;
        }
    }

    if (result.lstart && result.lend) {
        if (parity.lo / parity.totall > 0.70) lparity = 'O';
        if (parity.le / parity.totall > 0.70) lparity = 'E';

        if (!lparity) {
            if (result.lstart % 2 === 0 && result.lend % 2 === 0) {
                lparity = 'E';
            } else if (result.rstart % 2 === 1 && result.rend % 2 === 1) {
                lparity = 'O';
            } else {
                lparity = 'O';
            }
        }

        if (lparity === 'E') {
            if (result.lstart % 2 !== 0) result.lstart++;
            if (result.lend % 2 !== 0) result.lend++;
        } else {
            if (result.lstart % 2 !== 1) result.lstart++;
            if (result.lend % 2 !== 1) result.lend++;
        }
    }

    //Setup final results
    street.id = parseInt(new Date() / 1 + '' + Math.floor(Math.random() * 100));

    let tiles = [];
    tiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14});

    let centre = turf.pointOnSurface(street.geometry);

    //Total hack - MultiLineStrings shouldn't exist here - or at the very least should be labelled as such
    if (!centre && street.geometry.coordinates.length === 2) {
        street.geometry.type = 'MultiLineString';
        tiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14});
        centre = turf.pointOnSurface(street.geometry);
    }

    if (!centre || !verifyCenter(centre.geometry.coordinates, tiles)) {
        tmptiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14}); //14 is the max resolution for carmen
        let bbox = tilebelt.tileToBBOX(tmptiles[0]);
        centre = [ (bbox[2] + bbox[0]) / 2, (bbox[3] + bbox[1]) / 2 ];
    } else {
        centre = centre.geometry.coordinates;
    }

    let autonamed = street.properties['autonamed'];

    let text = street.properties['carmen:text'] ? street.properties['carmen:text']: street.properties.street;
    text = text.replace(/,/g, '');
    if (street.properties.alternates && street.properties.alternates.length > 0) {
        text = text + ',' + street.properties.alternates.join(',');
    }

    street.properties = {
        'carmen:text': text,
        'carmen:parityl': lparity,
        'carmen:lfromhn': result.lstart,
        'carmen:ltohn':   result.lend,
        'carmen:parityr': rparity,
        'carmen:rfromhn': result.rstart,
        'carmen:rtohn':   result.rend,
        'carmen:center': centre,
        'carmen:rangetype': 'tiger'
    }

    if (argv.debug) {
        street.properties.autonamed = autonamed;
        return debug(address, street, actualMatch)
    } else {
        return street;
    }
}

//Given a line and a point, find the start/end coords for the given segment
function segment(line, dist, units) {
    let coords = line.geometry.coordinates;

    let travelled = 0;
    for (let i = 0; i < coords.length; i++) {
        if (dist >= travelled && i === coords.length - 1) {
            break;
        } else if (travelled >= dist) {
            if (i === 0) return [coords[0], coords[1]];
            else return [coords[i-1], coords[i]];
        } else {
            travelled += turf.distance(turf.point(coords[i]), turf.point(coords[i+1]), units);
        }
    }
    //Last segment
    return [coords[coords.length - 2], coords[coords.length - 1]];
};


//DEBUG CODE
//This generates points which map to the start/end l/r of the interpolation line
//and uses the simple style spec to visualize

//The debug code also outputs in the format used in test/fixtures which are run by
// test/worker.test.js
function debug(address, street, actualMatch) {
    let debugFeat = [];

    function getPointByAddr(addr) {
        let idx = address.properties.numbers.indexOf(addr);
        return address.geometry.coordinates[idx];
    }

    //Colour autonamed streets red
    if (street.properties.autonamed) {
        street.properties.stroke = "#c6380c"
    } else {
        delete street.properties.autonamed;
    }

    if (street.properties['carmen:rfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(actualMatch.rstart), {
            'marker-color': '#b80e05',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:rtohn']) {
        debugFeat.push(turf.point(getPointByAddr(actualMatch.rend), {
            'marker-color': '#b80e05',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:lfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(actualMatch.lstart), {
            'marker-color': '#00a70d',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:ltohn']) {
        debugFeat.push(turf.point(getPointByAddr(actualMatch.lend), {
            'marker-color': '#00a70d',
            'street': street.properties['carmen:text']
        }));
    }

    let pts = address.geometry.coordinates.map((coords, i) => {
        if (address.properties.numbers[i] % 2 === 0) symbol = 'marker-stroked';
        else symbol = 'marker';

        return turf.point(coords, {
            'address': address.properties.numbers[i],
            'street': street.properties['carmen:text'],
            'marker-symbol': symbol
        })
    });

    let outFeats = [
        street
    ].concat(pts).concat(debugFeat)

    return {
        type: 'FeatureCollection',
        features: outFeats
    };
}

function verifyCenter(center, tiles) {
    let found = false;
    let i = 0;
    while (!found && i < tiles.length) {
        let bbox = tilebelt.tileToBBOX(tiles[i]);
        if (center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}
