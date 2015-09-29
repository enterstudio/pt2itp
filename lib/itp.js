var turf = require('turf');
var tokenize = require('./tokenize');
var explode = require('./explode');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign
var clusterAddress = require('./cluster');
var interpolize = require('./interpolize');

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
