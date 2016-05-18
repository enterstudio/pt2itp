module.exports = interpolize;
var turf = require('turf');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign
var _ = require('lodash');

module.exports.lsb = LSB;
module.exports.segment = segment;

//Left Side binary - Returns 1 or 0 for which is the left side
function LSB(start, end) {
    return sign(det2D(
        start,
        end,
        turf.destination(
            turf.center(turf.linestring([start, end])),
            0.01,
            turf.bearing(turf.point(start), turf.point(end)) - 90,
            'miles').geometry.coordinates
        ));
}

function interpolize(street, address, argv) {
    var dist = []
    var streetDist = turf.lineDistance(street, 'kilometers');

    //Generate coorelation between every address and its position on the line
    for (var address_it = 0; address_it < address.geometry.coordinates.length; address_it++) {
        var linePt = turf.pointOnLine(street, turf.point(address.geometry.coordinates[address_it])); //Closest pt on line to addr

        var res = {
            'distOnLine': turf.lineDistance(turf.lineSlice(turf.point(street.geometry.coordinates[0]), linePt, street), 'kilometers'),
            'distFromOrigin': turf.distance(turf.point(street.geometry.coordinates[0]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'distFromEnd':  turf.distance(turf.point(street.geometry.coordinates[street.geometry.coordinates.length -1]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'geometry': address.geometry.coordinates[address_it],
            'number': address.properties.numbers[address_it],
            'side': null
        };

        var seg = segment(street, res.distOnLine, 'kilometers');
        res.side = sign(det2D(seg[0], seg[1], address.geometry.coordinates[address_it]));

        dist.push(res);
    }

    var leftSide = LSB(street.geometry.coordinates[0], street.geometry.coordinates[1])

    var distStart = _.cloneDeep(dist.sort(function(a, b) {
        var distA = a.distOnLine + a.distFromOrigin;
        var distB = b.distOnLine + a.distFromOrigin;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    }));

    var distEnd = _.cloneDeep(dist.sort(function(a, b) {
        var distA = (streetDist - a.distOnLine) + a.distFromEnd;
        var distB = (streetDist - b.distOnLine) + a.distFromEnd;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    }));

    var result = {
        lparity: null,
        lstart: null,
        lend: null,
        rparity: null,
        rstart: null,
        rend: null
    };

    [distStart, distEnd].forEach(function(distMap, i) {
        if (i === 0) pos = 'start';
        else pos = 'end';

        for (var dist_it = 0; dist_it < distMap.length; dist_it++) {
            if (!result['l'+pos] && distMap[dist_it].side === leftSide) {
                result['l'+pos] = distMap[dist_it].number;
            } else if (!result['r'+pos] && distMap[dist_it].side !== leftSide) {
                result['r'+pos] = distMap[dist_it].number;
            }
        }
    });


    //Calculate number of odd/even on each side
    var parity = {
        totall: 0,
        lo: 0,
        le: 0,
        totalr: 0,
        ro: 0,
        re: 0
    }
    dist.forEach(function(d) {
        if (d.side === leftSide && d.number % 2 === 0) parity.le++;
        if (d.side === leftSide && d.number % 2 === 1) parity.lo++;
        if (d.side !== leftSide && d.number % 2 === 0) parity.re++;
        if (d.side !== leftSide && d.number % 2 === 1) parity.ro++;
    });
    parity.totall = parity.lo + parity.le;
    parity.totalr = parity.ro + parity.re;

    var lparity;
    var rparity;

    if (parity.lo / parity.totall > 0.80) lparity = 'O';
    if (parity.le / parity.totall > 0.80) lparity = 'E';
    if (parity.ro / parity.totalr > 0.80) rparity = 'O';
    if (parity.re / parity.totalr > 0.80) rparity = 'E';

    //Setup final results
    street.id = parseInt(new Date() / 1 + "" + Math.floor(Math.random() * 100));
    street.properties = {
        "carmen:text": street.properties['carmen:text'] ? street.properties['carmen:text']: street.properties.street,
        "carmen:lparity": lparity,
        "carmen:lfromhn": result.lstart,
        "carmen:ltohn":   result.lend,
        "carmen:rparity": rparity,
        "carmen:rfromhn": result.rstart,
        "carmen:rtohn":   result.rend,
        "carmen:center": street.geometry.coordinates[0][0]
        "carmen:rangetype": "tiger"
    }

    if (argv && argv.debug) return debug(address, street)
    else return street;
}

//Given a line and a point, find the start/end coords for the given segment
function segment(line, dist, units) {
    var coords = line.geometry.coordinates;

    var travelled = 0;
    for (var i = 0; i < coords.length; i++) {
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
function debug(address, street) {
    var debugFeat = [];

    function getPointByAddr(addr) {
        var idx = address.properties.numbers.indexOf(addr);
        return address.geometry.coordinates[idx];
    }

    if (street.properties['carmen:rfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:rfromhn']), {
            'marker-color': '#b80e05',
            'address': 'rfromhn'
        }));
    }
    if (street.properties['carmen:rtohn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:rtohn']), {
            'marker-color': '#b80e05',
            'address': 'rtohn'
        }));
    }
    if (street.properties['carmen:lfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:lfromhn']), {
            'marker-color': '#00a70d',
            'address': 'lfromhn'
        }));
    }
    if (street.properties['carmen:ltohn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:ltohn']), {
            'marker-color': '#00a70d',
            'address': 'ltohn'
        }));
    }

    var pts = address.geometry.coordinates.map(function(coords, i) {
        if (address.properties.numbers[i] % 2 === 0) symbol = "marker-stroked";
        else symbol = "marker";

        return turf.point(coords, {
            "address": address.properties.numbers[i],
            "street": address.properties.street,
            "marker-symbol": symbol
        })
    });

    var outFeats = [
        street
    ].concat(pts).concat(debugFeat)

    var finalFeats = outFeats.map(function(feat) {
        if (feat.properties.street) feat.properties.street = feat.properties.street.join(' ');
        return feat;
    });

    return {
        type: 'FeatureCollection',
        features: finalFeats
    };
}
