var turf = require('turf');
var tokenize = require('./tokenize');
var explode = require('./explode');

var DEBUG = {
    freq: process.env.DEBUG_FREQ ? true : false,
    link: process.env.DEBUG_LINK ? true : false,
    basic: process.env.DEBUG ? true : false //enable for basic stats
};


module.exports = function(tileLayers, opts, done) {
    if (tileLayers.Addresses.addresses.features.length === 0) return;
    if (tileLayers.Streets.streets.features.length === 0) return;

    var addresses = tokenizeFeat(clusterAddress(tileLayers.Addresses.addresses));
    var streets = explode(tokenizeFeat(tileLayers.Streets.streets));
  
    if (DEBUG.basic) console.log('ok -', addresses.features.length, 'clusters |', streets.features.length, 'streets')

    var nameFreq = streetFreq(streets, addresses);
    var link = linker(nameFreq, streets, addresses);

    if (DEBUG.basic) console.log('ok -', Object.keys(link).length, '/', streets.features.length, 'streets matched');

    street_keys = Object.keys(link);  
    for (street_keys_it = 0; street_keys_it < street_keys.length; street_keys_it++) {
        newStreet = interpolize(streets.features[street_keys[street_keys_it]], addresses.features[link[street_keys[street_keys_it]]]);
    }

    done(null, {});
}

function det2D(start, end, query) { return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]); }
function sign(num) { return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN; }

/**
 * Given a single street & address cluster feature generate interpolation
 */
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

    var distStart = dist.sort(function(a, b) {
        var distA = a.distOnLine + a.distFromOrigin;
        var distB = b.distOnLine + a.distFromOrigin;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    });

    var distEnd = dist.sort(function(a, b) {
        var distA = (streetDist - a.distOnLine) + a.distFromEnd;
        var distB = (streetDist - b.distOnLine) + a.distFromEnd;
        if (distA < distB) return -1;
        if (distA > distB) return 1;
        return 0;
    });

    var result = {
        lstart: null,
        lend: null,
        rstart: null,
        rend: null
    };

    [distStart, distEnd].forEach(function(dist, i) {
        if (i === 0) {
            coords = [street.geometry.coordinates[0], street.geometry.coordinates[1]]
            sideControl = LeftSideStart;
            pos = 'start'
        } else {
            coords = [street.geometry.coordinates[street.geometry.coordinates.length - 2], street.geometry.coordinates[street.geometry.coordinates.length - 1]]
            sideControl = LeftSideEnd;
            pos = 'end'
        }

        for (var dist_it = 0; dist_it < dist.length; dist++) {
            var sideBinary = sign(det2D(coords[0], coords[1], dist[dist_it].geometry));
            if (!result['l'+pos] && sideBinary === sideControl) {
                result['l'+pos] = dist[dist_it];
            } else if (!result['r'+pos]) {
                result['r'+pos] = dist[dist_it];
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

    console.log(JSON.stringify({
        type: 'FeatureCollection',
        features: [
            address,
            street
        ]
    }))

    //TODO calculate Parity from all points on a side

    process.exit(1);
}

//Left Side binary - Returns 1 or 0 for which is the left side
function LSB(start, end) {
    var leftSideBinaryStart = sign(det2D(
        start,
        end,
        turf.destination(
            turf.center(turf.linestring([start, end])),
            0.01,
            turf.bearing(turf.point(start), turf.point(end)) - 90,
            'miles').geometry.coordinates
        ));
}  

/**
 * Generates a map of streets => address 
 */
function linker(nameFreq, streets, addresses) {
   var link = {};

   for (var street_it = 0; street_it < streets.features.length; street_it++) {
        var streetName = streets.features[street_it].properties.street;
        var match = [0, null] //[SCORE, ADDRESS_IT] (Note: Max score = 100)
        for (address_it = 0; address_it < addresses.features.length; address_it++) {
            var addressName = addresses.features[address_it].properties.street;
            var maxScore = 0;
            var score = 0;

            for (token_it = 0; token_it < streetName.length; token_it++) {
                maxScore += nameFreq[streetName[token_it]];
                if (addressName.indexOf(streetName[token_it]) !== -1) {
                    score += nameFreq[streetName[token_it]];
                }
            }

            if (score > match[0]) {
                match = [score, address_it];
            }
        }
        if (DEBUG.link) console.log(match[0], streetName, '=>', addresses.features[match[1]] ? addresses.features[match[1]].properties.street : null)
        if (match[0] > .50) {
            link[street_it] = match[1];
        }
    }
    
    return link;
}

function streetFreq(streets, addresses) {
    nameFreq = {
        '_min': 1,
        '_max': 1
    };
    
    freq(streets);
    freq(addresses);

    //Maps each token count to ( ${Max Tokens} / ${Token Count} )
    var freq_keys = Object.keys(nameFreq);
    for (var freq_it = 0; freq_it < freq_keys.length; freq_it++) {
        nameFreq[freq_keys[freq_it]] = nameFreq._max / nameFreq[freq_keys[freq_it]];
    }

    if (DEBUG.freq) console.log(nameFreq);
    return nameFreq;

    //Calculates the number of instances of a given token
    function freq(feats) {
        for (var feat_it = 0; feat_it < feats.features.length; feat_it++) {
            for (var token_it = 0; token_it < feats.features[feat_it].properties.street.length; token_it++) {
                var token = feats.features[feat_it].properties.street[token_it];
                if (nameFreq[token]) {
                    nameFreq[token]++;
                    if (nameFreq[token] > nameFreq._max) {
                        nameFreq._max++;
                    }
                } else {
                    nameFreq[token] = 1;
                }
            }
        }
    }
}

function tokenizeFeat(feats) {
    feats.features = feats.features.map(function(feat) {
        if (feat.properties.street) {
            feat.properties.street = tokenize(feat.properties.street);
        } else {
            feat.properties.street = [];
        }
        return feat;
    });
    return feats;
}

function clusterAddress(feats) {
    var featMap = {};
    var featCluster = {
        type: 'FeatureCollection',
        features: []
    }

    for (var i = 0; i < feats.features.length; i++) {
        var street = feats.features[i].properties.street;
        if (featMap[street]) {
            featMap[street].properties.numbers.push(feats.features[i].properties.number);
            featMap[street].geometry.coordinates.push(feats.features[i].geometry.coordinates);
        } else {
            featMap[street] = {
                type: 'Feature',
                properties: {
                    street: street,
                    numbers: [feats.features[i].properties.number]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [feats.features[i].geometry.coordinates]
                }
            }
        }
    }

    for (var i = 0; i < Object.keys(featMap).length; i++) {
        featCluster.features.push(featMap[Object.keys(featMap)[i]]);
    }

    return featCluster;
}
