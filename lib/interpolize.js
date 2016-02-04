module.exports = interpolize;
var turf = require('turf');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign

module.exports.lsb = LSB;

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

function interpolize(street, address) {
    var dist = []
    var streetDist = turf.lineDistance(street, 'kilometers');

    for (var address_it = 0; address_it < address.geometry.coordinates.length; address_it++) {
        var linePt = turf.pointOnLine(street, turf.point(address.geometry.coordinates[address_it])); //Closest pt on line to addr
        dist.push({
            'distOnLine': turf.lineDistance(turf.lineSlice(turf.point(street.geometry.coordinates[0]), linePt, street), 'kilometers'),
            'distFromOrigin': turf.distance(turf.point(street.geometry.coordinates[0]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'distFromEnd':  turf.distance(turf.point(street.geometry.coordinates[street.geometry.coordinates.length -1]), turf.point(address.geometry.coordinates[address_it]), 'kilometers'),
            'geometry': address.geometry.coordinates[address_it],
            'number': address.properties.numbers[address_it]
        });
    }

    var LeftSideStart = LSB(street.geometry.coordinates[0], street.geometry.coordinates[1])
    var LeftSideEnd = LSB(street.geometry.coordinates[street.geometry.coordinates.length - 2], street.geometry.coordinates[street.geometry.coordinates.length - 1])

    var distStart = JSON.parse(JSON.stringify(dist.sort(function(a, b) {
        var distA = a.distOnLine + a.distFromOrigin;
        var distB = b.distOnLine + a.distFromOrigin;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    })));

    var distEnd = JSON.parse(JSON.stringify(dist.sort(function(a, b) {
        var distA = (streetDist - a.distOnLine) + a.distFromEnd;
        var distB = (streetDist - b.distOnLine) + a.distFromEnd;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    })));

    var result = {
        lstart: null,
        lend: null,
        rstart: null,
        rend: null
    };

    [distStart, distEnd].forEach(function(distMap, i) {
        if (i === 0) {
            coords = [street.geometry.coordinates[0], street.geometry.coordinates[1]]
            sideControl = LeftSideStart;
            pos = 'start'
        } else {
            coords = [street.geometry.coordinates[street.geometry.coordinates.length - 2], street.geometry.coordinates[street.geometry.coordinates.length - 1]]
            sideControl = LeftSideEnd;
            pos = 'end'
        }

        for (var dist_it = 0; dist_it < distMap.length; dist_it++) {
            var sideBinary = sign(det2D(coords[0], coords[1], distMap[dist_it].geometry));
            if (!result['l'+pos] && sideBinary === sideControl) {
                result['l'+pos] = distMap[dist_it];
            } else if (!result['r'+pos]) {
                result['r'+pos] = distMap[dist_it];
            }
        }
    });

    street.properties = {
        street: street.properties.street,
        lstart: result.lstart ? result.lstart.number : null,
        lend:   result.lend   ? result.lend.number   : null ,
        rstart: result.rstart ? result.rstart.number : null,
        rend:   result.rend   ? result.rend.number   : null
    }

    if (process.env.DEBUG) return debug(address, street)
    else return street;
}

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

    if (street.properties.rstart) {
        debugFeat.push(turf.point(getPointByAddr(street.properties.rstart), {
            'marker-color': '#b80e05'
        }));
    }
    if (street.properties.rend) {
        debugFeat.push(turf.point(getPointByAddr(street.properties.rend), {
            'marker-color': '#b80e05'
        }));
    }
    if (street.properties.lstart) {
        debugFeat.push(turf.point(getPointByAddr(street.properties.lstart), {
            'marker-color': '#00a70d'
        }));
    }
    if (street.properties.lend) {
        debugFeat.push(turf.point(getPointByAddr(street.properties.lend), {
            'marker-color': '#00a70d'
        }));
    }

    var pts = address.geometry.coordinates.map(function(coords, i) {
        if (address.properties.numbers[i] % 2 === 0) symbol = "marker-stroked";
        else symbol = "marker";

        return turf.point(coords, {
            "address": address.properties.numbers[i],
            "marker-symbol": symbol
        })
    });

    var outFeats = [
            street
        ].concat(pts)
        .concat(debugFeat)
    var finalFeats = outFeats.map(function(feat) {
        if (feat.properties.street) feat.properties.street = feat.properties.street.join(' ');
        return feat;
    });

    return {
        type: 'FeatureCollection',
        features: finalFeats 
    };

}
