module.exports = interpolize;
module.exports.lsb = LSB;
module.exports.segment = segment;
module.exports.genFeat = genFeat;
module.exports.itpSort = itpSort;
module.exports.dropLow = dropLow;
module.exports.raiseHigh = raiseHigh;
module.exports.diff = diff;

const tilebelt = require('@mapbox/tilebelt');
const cover = require('@mapbox/tile-cover');
const turf = require('@turf/turf');
const _ = require('lodash');

const misc = require('./misc');

function interpolize(text, splits, argv = {}) {

    //Storing these values allows us to push the lower and upper bounds of the calculated ITP.
    //For example if an ITP starts with 32 => assume it starts at 0 if it ends at 87 assume 101, etc
    let max = -1;
    let min = Infinity;

    let itps = [];

    for (let split of splits) {
        if (!split.address || !split.number) {
            itps.push(genFeat(text, split, null, argv));
            continue;
        }

        let dist = [];

        let streetdist = turf.lineDistance(split.network, 'kilometers');

        //true if beginning of linestring is lowest number
        //false if beginning of linestring is highest number
        let sequence;
        let seqcalc = []; //tmp var used to calculate sequence [closest start, closest end]

        //generate coorelation between every address and its position on the line
        for (let address_it = 0; address_it < split.address.geometry.coordinates.length; address_it++) {
            if (parseInt(split.number[address_it]) < min) min = parseInt(split.number[address_it]);
            if (parseInt(split.number[address_it]) > max) max = parseInt(split.number[address_it]);

            let linept = turf.pointOnLine(split.network, turf.point(split.address.geometry.coordinates[address_it])); //closest pt on line to addr

            let res = {
                'distonline': turf.lineDistance(turf.lineSlice(turf.point(split.network.geometry.coordinates[0]), linept, split.network), 'kilometers'),
                'distfromorigin': turf.distance(turf.point(split.network.geometry.coordinates[0]), turf.point(split.address.geometry.coordinates[address_it]), 'kilometers'),
                'distfromend':  turf.distance(turf.point(split.network.geometry.coordinates[split.network.geometry.coordinates.length -1]), turf.point(split.address.geometry.coordinates[address_it]), 'kilometers'),
                'geometry': turf.point(split.address.geometry.coordinates[address_it]),
                'number': parseInt(split.number[address_it]),
                'side': null
            };

            let seg = segment(split.network, res.distonline, 'kilometers');
            res.side = misc.sign(misc.det2D(seg[0], seg[1], split.address.geometry.coordinates[address_it]));

            if (!seqcalc[0] || seqcalc[0].distfromorigin > res.distfromorigin) {
                seqcalc[0] = res;
            }
            if (!seqcalc[1] || seqcalc[1].distfromend > res.distfromend) {
                seqcalc[1] = res;
            }

            dist.push(res);
        }

        if (seqcalc[0].number > seqcalc[1]) sequence = false;
        else sequence = true;

        let leftside = LSB(split.network.geometry.coordinates[0], split.network.geometry.coordinates[1])

        let diststart = _.cloneDeep(dist.sort((a, b) => {
            if (a.distonline !== 0 && b.distonline !== 0) { //handle cases where both addresses are to the direct left/right of the line
                let dista = a.distonline + a.distfromorigin;
                let distb = b.distonline + a.distfromorigin;
                if (dista < distb) return -1;
                if (dista > distb) return 1;
                return 0;
            } else if (a.distonline === 0 && b.distonline !== 0) { //a is off the beginning of the line, b is l/r of the line
                return -1;
            } else if (b.distonline === 0 && a.distonline !== 0) { //b is off the beginning of the line, a is l/r of the line
                return 1;
            } else if (sequence && a.number < b.number) { //both a/b are off the end of the line
                return -1;
            } else if (!sequence && a.number > b.number) {
                return -1;
            } else {
                return 0;
            }
        }));

        let distend = _.cloneDeep(dist.sort((a, b) => {
            if ((streetdist - a.distonline) !== 0 && (streetdist - b.distonline) !== 0) { //handle cases where both addresses are to the direct left/right of the line
                let dista = (streetdist - a.distonline) + a.distfromend;
                let distb = (streetdist - b.distonline) + a.distfromend;
                if (dista < distb) return -1;
                if (dista > distb) return 1;
                return 0;
            } else if ((streetdist - a.distonline) === 0 && (streetdist - b.distonline) !== 0) { //a is off the beginning of the line, b is l/r of the line
                return -1;
            } else if ((streetdist - b.distonline) === 0 && (streetdist - a.distonline) !== 0) { //b is off the beginning of the line, a is l/r of the line
                return 1;
            } else if (sequence && a.number > b.number) { //both a/b are off the end of the line
                return -1;
            } else if (!sequence && a.number < b.number) {
                return -1;
            } else {
                return 0;
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

        //calculate number of odd/even on each side
        let parity = {
            totall: 0,
            lo: 0,
            le: 0,
            totalr: 0,
            ro: 0,
            re: 0
        }

        dist.forEach((d) => {
            //don't count addr off the end of the line in parity as if the road bends (past the line geom)
            //the l/r calc could be incorrect
            if (d.distfromorigin !== 0 && (streetdist - d.distfromend) !== 0) {
                if (d.side === leftside && d.number % 2 === 0) parity.le++;
                if (d.side === leftside && d.number % 2 === 1) parity.lo++;
                if (d.side !== leftside && d.number % 2 === 0) parity.re++;
                if (d.side !== leftside && d.number % 2 === 1) parity.ro++;
            }
        });

        parity.totall = parity.lo + parity.le;
        parity.totalr = parity.ro + parity.re;

        //calculate start l/r address
        for (let dist_it = 0; dist_it < diststart.length; dist_it++) {
            if (diststart[dist_it].distonline !== 0 && !result.lstart && diststart[dist_it].side === leftside) {
                result.lstart = diststart[dist_it];
            } else if (diststart[dist_it].distonline !== 0 && !result.rstart && diststart[dist_it].side !== leftside) {
                result.rstart = diststart[dist_it];
            } else {
                if (!result.lstart) {
                    if (parity.lo > parity.le && diststart[dist_it].number % 2 == 1) {
                        result.lstart = diststart[dist_it];
                    } else if (parity.le > parity.lo && diststart[dist_it].number % 2 == 0) {
                        result.lstart = diststart[dist_it];
                    }
                }
                if (!result.rstart) {
                    if (parity.ro > parity.re && diststart[dist_it].number % 2 == 1) {
                        result.rstart = diststart[dist_it];
                    } else if (parity.re > parity.ro && diststart[dist_it].number % 2 == 0) {
                        result.rstart = diststart[dist_it];
                    }
                }
            }
        }

        //calculate end l/r address
        for (let dist_it = 0; dist_it < distend.length; dist_it++) {

            //if point falls on line (not off end of line) && no current left side && point is on left side
            if (distend[dist_it].distonline - streetdist !== 0 && !result.lend && distend[dist_it].side === leftside) {
                result.lend = distend[dist_it];

            //if point falls on line (not off end of line) && no current right side && point is not on left side (right side)
            } else if (distend[dist_it].distonline - streetdist !== 0 && !result.rend && distend[dist_it].side !== leftside) {
                result.rend = distend[dist_it];

            //if there still isn't a match fall back to finding the closest match with the correct parity
            } else {
                if (!result.lend) {
                    if (parity.lo > parity.le && distend[dist_it].number % 2 == 1) {
                        result.lend = distend[dist_it];
                    } else if (parity.le > parity.lo && distend[dist_it].number % 2 == 0) {
                        result.lend = distend[dist_it];
                    }
                }
                if (!result.rend) {
                    if (parity.ro > parity.re && distend[dist_it].number % 2 == 1) {
                        result.rend = distend[dist_it];
                    } else if (parity.re > parity.ro && distend[dist_it].number % 2 == 0) {
                        result.rend = distend[dist_it];
                    }
                }
            }
        }

        if (!result.rstart && result.rend) result.rstart = result.rend;
        if (!result.rend && result.rstart) result.rend = result.rstart;
        if (!result.lstart && result.lend) result.lstart = result.lend;
        if (!result.lend && result.lstart) result.lend = result.lstart;

        //assign debug properties
        if (result.rstart) {
            result.rstart.geometry.properties.start = true;
            result.rstart.geometry.properties.right = true;
        }
        if (result.lstart) {
            result.lstart.geometry.properties.start = true;
            result.lstart.geometry.properties.left = true;
        }
        if (result.rend) {
            result.rend.geometry.properties.end = true;
            result.rend.geometry.properties.right = true;
        }
        if (result.lend) {
            result.lend.geometry.properties.end = true;
            result.lend.geometry.properties.left = true;
        }

        //sometimes the calculated start/end point isn't the same as the calculated parity
        //in these cases +1 the number to match parity
        if (result.rstart && result.rend) {
            if (parity.ro / parity.totalr > 0.70) result.rparity = 'O';
            if (parity.re / parity.totalr > 0.70) result.rparity = 'E';

            //at lease some parity is needed to make this work
            if (!result.rparity) {
                if (result.rstart.number % 2 === 0 && result.rend.number % 2 === 0) {
                    result.rparity = 'E';
                } else if (result.rstart.number % 2 === 1 && result.rend.number % 2 === 1) {
                    result.rparity = 'O';
                } else { //this is completely arbitrary - in the us odd are usually left/even right
                    result.rparity = 'E';
                }
            }

            if (result.rparity === 'E') {
                if (result.rstart.number % 2 !== 0) {
                    result.rstart.number++;
                }
                if (result.rend.number % 2 !== 0) {
                    result.rend.number++;
                }
            } else {
                if (result.rstart.number % 2 !== 1) result.rstart.number++;
                if (result.rend.number % 2 !== 1) result.rend.number++;
            }
        }

        //sometimes the calculated start/end point isn't the same as the calculated parity
        //in these cases +1 the number to match parity
        if (result.lstart && result.lend) {
            if (parity.lo / parity.totall > 0.70) result.lparity = 'O';
            if (parity.le / parity.totall > 0.70) result.lparity = 'E';

            if (!result.lparity) {
                if (result.lstart && result.lend && result.lstart.number % 2 === 0 && result.lend.number % 2 === 0) {
                    result.lparity = 'E';
                } else if (result.rstart && result.rend && result.rstart.number % 2 === 1 && result.rend.number % 2 === 1) {
                    result.lparity = 'O';
                } else {
                    result.lparity = 'O';
                }
            }

            if (result.lparity === 'E') {
                if (result.lstart && result.lstart.number % 2 !== 0) result.lstart.number++;
                if (result.lend && result.lend.number % 2 !== 0) result.lend.number++;
            } else {
                if (result.lstart && result.lstart.number % 2 !== 1) result.lstart.number++;
                if (result.lend && result.lend.number % 2 !== 1) result.lend.number++;
            }
        }


        const resFeat = genFeat(text, split, result, argv);

        if (argv.debug) {
            let debug = {
                type: 'featurecollection',
                features: []
            };

            ['lstart', 'lend', 'rstart', 'rend'].forEach((prop) => {
                if (result[prop]) debug.features.push(result[prop].geometry);
            });

            if (debug.features.length) resFeat.debug = debug;
        }

        itps.push(resFeat);
    }

    //Sort ITP output to start with lowest number and end with highest/no ITP values
    itps.sort(itpSort);

    //If max or min didn't change from inf values don't try to change actual min/max

    if (max === -1 && min === Infinity) return join(itps);
    let d = diff(max, min);

    //Drop Lower Values on L/R side to include more potential addresses ie 22 => 0
    if (itps[0].properties['carmen:lfromhn'][0] < itps[0].properties['carmen:ltohn'][0]) {
        itps[0].properties['carmen:lfromhn'][0] = dropLow(itps[0].properties['carmen:lfromhn'][0], d);
    } else {
        itps[0].properties['carmen:ltohn'][0] = dropLow(itps[0].properties['carmen:ltohn'][0], d);
    }

    if (itps[0].properties['carmen:rfromhn'][0] < itps[0].properties['carmen:rtohn'][0]) {
        itps[0].properties['carmen:rfromhn'][0] = dropLow(itps[0].properties['carmen:rfromhn'][0], d);
    } else {
        itps[0].properties['carmen:rtohn'][0] = dropLow(itps[0].properties['carmen:rtohn'][0], d);
    }


    //Raise Upper Values on L/R side
    let end = itps.length - 1;
    while (end + 1) {
        if (!itps[end].properties['carmen:rangetype']) {
            end--;
            continue;
        }

        if (itps[end].properties['carmen:lfromhn'][0] > itps[end].properties['carmen:ltohn'][0]) {
            itps[end].properties['carmen:lfromhn'][0] = raiseHigh(itps[end].properties['carmen:lfromhn'][0], d);
        } else {
            itps[end].properties['carmen:ltohn'][0] = raiseHigh(itps[end].properties['carmen:ltohn'][0], d);
        }

        if (itps[end].properties['carmen:rfromhn'][0] > itps[end].properties['carmen:rtohn'][0]) {
            itps[end].properties['carmen:rfromhn'][0] = raiseHigh(itps[end].properties['carmen:rfromhn'][0], d);
        } else {
            itps[end].properties['carmen:rtohn'][0] = raiseHigh(itps[end].properties['carmen:rtohn'][0], d);
        }

        break;
    }

    return join(itps);
}

function join(itps) {
    let itp = {
        type: 'Feature',
        properties: {
            'carmen:text': itps[0].properties['carmen:text'],
            'carmen:geocoder_stack': itps[0].properties['carmen:geocoder_stack'],
            'carmen:center':  itps[0].properties['carmen:center'],
            'carmen:addressnumber': [ null, [] ],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [ [], null ],
            'carmen:lfromhn': [ [], null ],
            'carmen:ltohn': [ [], null ],
            'carmen:parityr': [ [], null ],
            'carmen:rfromhn': [ [], null ],
            'carmen:rtohn': [ [], null ],
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: []
            }, {
                type: 'MultiPoint',
                coordinates: []
            }]
        }
    };

    let text = itps[0].properties['carmen:text'];
    for (let res of itps) {
        itp.geometry.geometries[0].coordinates.push(res.geometry.geometries[0].coordinates);

        if (res.properties['carmen:rangetype']) {
            ['carmen:parityl', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:parityr', 'carmen:rfromhn', 'carmen:rtohn'].forEach((prop) => {
                itp.properties[prop][0].push(res.properties[prop][0]);
            });
        } else {
            ['carmen:parityl', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:parityr', 'carmen:rfromhn', 'carmen:rtohn'].forEach((prop) => {
                itp.properties[prop][0].push(null);
            });
        }

        if (res.properties['carmen:addressnumber']) {
            itp.properties['carmen:addressnumber'][1] = itp.properties['carmen:addressnumber'][1].concat(res.properties['carmen:addressnumber'][1]);
            itp.geometry.geometries[1].coordinates = itp.geometry.geometries[1].coordinates.concat(res.geometry.geometries[1].coordinates);
        }
    }

    itp = misc.id(itp);

    return itp;
}

function diff(max, min) {
    return Math.pow(10, Math.round(Math.log10(Math.abs(max - min)))); //Diff represented in 10^n
}

function dropLow(low, d) {
    let isEven = low % 2 === 0;

    if (d === 1) d = d * 10;

    if (low - d < -1) return isEven ? 0 : 1;
    return low - (low % d) + (isEven ? 0 : 1);
}

function raiseHigh(high, d) {
    let isEven = high % 2 === 0;

    if (high % 10 === 0) high++; //Avoid 10 w/ d 1 gunking up
    if (d === 1) d = d * 10;

    if (high < d) return d + (isEven ? 0 : 1);

    return  Math.ceil(high / d) * d + (isEven ? 0 : 1);
}

function itpSort(aFeat, bFeat) {
    a = aFeat.properties['carmen:lfromhn'] ? aFeat.properties['carmen:lfromhn'] : aFeat.properties['carmen:rfromhn'];
    b = bFeat.properties['carmen:lfromhn'] ? bFeat.properties['carmen:lfromhn'] : bFeat.properties['carmen:rfromhn'];

    if (!a) return 1;
    if (!b) return -1;

    return a - b;
}

function genFeat(text, split, result, argv) {
    let tiles = [];
    tiles = cover.tiles(split.network.geometry, { min_zoom: 14, max_zoom: 14 });

    let centre = turf.pointOnSurface(split.network.geometry);

    if (!centre || !verifyCenter(centre.geometry.coordinates, tiles)) {
        tmptiles = cover.tiles(split.network.geometry, { min_zoom: 14, max_zoom: 14 }); //14 is the max resolution for carmen
        let bbox = tilebelt.tiletobbox(tmptiles[0]);
        centre = [ (bbox[2] + bbox[0]) / 2, (bbox[3] + bbox[1]) / 2 ];
    } else {
        centre = centre.geometry.coordinates;
    }

    let res = {
        type: 'Feature',
        properties: {
            'carmen:text': text,
            'carmen:center': centre,
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                split.network.geometry
            ]
        }
    }

    if (argv && argv.country) res.properties['carmen:geocoder_stack'] = argv.country;

    //Network has no points assigned to it - cannot be ITP at this stage
    if (!result) return res;

    res.properties['carmen:rangetype'] = 'tiger';
    res.properties['carmen:parityl'] = [ result.lparity ? result.lparity : null ];
    res.properties['carmen:lfromhn'] = [ result.lstart ? result.lstart.number : null ];
    res.properties['carmen:ltohn'] = [ result.lend ? result.lend.number : null ];
    res.properties['carmen:parityr'] = [ result.rparity ? result.rparity : null ];
    res.properties['carmen:rfromhn'] = [ result.rstart ? result.rstart.number : null ];
    res.properties['carmen:rtohn'] = [ result.rend ? result.rend.number : null ];

    if (split.address && split.number) {
        ['carmen:parityl', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:parityr', 'carmen:rfromhn', 'carmen:rtohn'].forEach((prop) => {
            res.properties[prop].push(null);
        });

        res.properties['carmen:addressnumber'] = [ null, split.number ];
        res.geometry.geometries.push(split.address.geometry);
    }

    return res;
}

//given a line and a point, find the start/end coords for the given segment
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

//Left Side binary - Returns 1 or 0 for which is the left side
function LSB(start, end) {
    return misc.sign(misc.det2D(
        start,
        end,
        turf.destination(
            turf.center(turf.lineString([start, end])),
            0.01,
            turf.bearing(turf.point(start), turf.point(end)) - 90,
            'miles').geometry.coordinates
        ));
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
