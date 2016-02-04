var turf = require('turf');
var tokenize = require('./tokenize');
var explode = require('./explode');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign
var clusterAddress = require('./cluster');
var interpolize = require('./interpolize');
var linker = require('./linker');
var streetFreq = require('./freq');

module.exports = function(data, xyz, writeData, done) {
    if (data.Addresses.addresses.features.length === 0) return done(new Error('No address data in: ' + xyz.join(',')));
    if (data.Streets.streets.features.length === 0) return done(new Error('No street data in: ' + xyz.join(',')));

    var addresses = tokenizeFeat(clusterAddress(data.Addresses.addresses));
    var streets = explode(tokenizeFeat(data.Streets.streets));

    var nameFreq = streetFreq(streets, addresses);
    var link = linker(nameFreq, streets, addresses);

    street_keys = Object.keys(link);
    var tileResults = [];
    for (street_keys_it = 0; street_keys_it < street_keys.length; street_keys_it++) {
        newStreet = interpolize(streets.features[street_keys[street_keys_it]], addresses.features[link[street_keys[street_keys_it]]]);
        if (writeData) writeData(JSON.stringify(newStreet) + '\n');
        tileResults.push(newStreet);
    }

    done(null, tileResults);
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
