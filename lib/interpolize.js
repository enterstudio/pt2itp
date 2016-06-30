module.exports = interpolize;
var turf = require('turf');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign
var _ = require('lodash');
var ruler = require('cheap-ruler');
var tilebelt = require('tilebelt');
var cover = require('tile-cover');

module.exports.lsb = LSB;
module.exports.segment = segment;

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
    street.id = parseInt(new Date() / 1 + '' + Math.floor(Math.random() * 100));

    var tiles = [];
    tiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14});

    var centre = turf.pointOnSurface(street.geometry);

    //Total hack - MultiLineStrings shouldn't exist here - or at the very least should be labelled as such
    if (!centre && street.geometry.coordinates.length === 2) {
        street.geometry.type = 'MultiLineString';
        tiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14});
        centre = turf.pointOnSurface(street.geometry);
    }

    if (!centre || !verifyCenter(centre.geometry.coordinates, tiles)) {
        tmptiles = cover.tiles(street.geometry, {min_zoom: 14, max_zoom: 14}); //14 is the max resolution for carmen
        var bbox = tilebelt.tileToBBOX(tmptiles[0]);
        centre = [ (bbox[2] + bbox[0]) / 2, (bbox[3] + bbox[1]) / 2 ];
    } else {
        centre = centre.geometry.coordinates;
    }

    var autonamed = street.properties['autonamed'];

    var text = street.properties['carmen:text'] ? street.properties['carmen:text']: street.properties.street;
    text = text.replace(/,/g);
    if (street.properties.alternates && street.properties.alternates.length > 0) {
        text = text + ',' + street.properties.alternates.join(',');
    }

    street.properties = {
        'carmen:text': text,
        'carmen:lparity': lparity,
        'carmen:lfromhn': result.lstart,
        'carmen:ltohn':   result.lend,
        'carmen:rparity': rparity,
        'carmen:rfromhn': result.rstart,
        'carmen:rtohn':   result.rend,
        'carmen:center': centre,
        'carmen:rangetype': 'tiger'
    }

    if (argv && argv.debug) {
        street.properties.autonamed = autonamed;
        return debug(address, street)
    } else {
        return street;
    }
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

    //Colour autonamed streets red
    if (street.properties.autonamed) {
        street.properties.stroke = "#c6380c"
    } else {
        delete street.properties.autonamed;
    }

    if (street.properties['carmen:rfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:rfromhn']), {
            'marker-color': '#b80e05',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:rtohn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:rtohn']), {
            'marker-color': '#b80e05',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:lfromhn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:lfromhn']), {
            'marker-color': '#00a70d',
            'street': street.properties['carmen:text']
        }));
    }
    if (street.properties['carmen:ltohn']) {
        debugFeat.push(turf.point(getPointByAddr(street.properties['carmen:ltohn']), {
            'marker-color': '#00a70d',
            'street': street.properties['carmen:text']
        }));
    }

    var pts = address.geometry.coordinates.map(function(coords, i) {
        if (address.properties.numbers[i] % 2 === 0) symbol = 'marker-stroked';
        else symbol = 'marker';

        return turf.point(coords, {
            'address': address.properties.numbers[i],
            'street': street.properties['carmen:text'],
            'marker-symbol': symbol
        })
    });

    var outFeats = [
        street
    ].concat(pts).concat(debugFeat)

    return {
        type: 'FeatureCollection',
        features: outFeats
    };
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while (!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if (center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}
