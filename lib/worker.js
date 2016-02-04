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
    if (data.Addresses.addresses.features.length === 0) return done(null, 'No address data in: ' + xyz.join(','));
    if (data.Streets.streets.features.length === 0) return done(null, 'No street data in: ' + xyz.join(','));

    var addresses = tokenizeFeat(clusterAddress(data.Addresses.addresses));
    var streets = explode(tokenizeFeat(data.Streets.streets));

    var nameFreq = streetFreq(streets, addresses);
    var link = linker(nameFreq, streets, addresses);

    if (!link) return done(null, 'No links found in: ' + xyz.join(','));

    street_keys = Object.keys(link);
    var results = [];
    for (street_keys_it = 0; street_keys_it < street_keys.length; street_keys_it++) {
        newStreet = interpolize(streets.features[street_keys[street_keys_it]], addresses.features[link[street_keys[street_keys_it]]]);
        results.push(newStreet);
    }

    if (writeData) {
        var count = results.length;
        results = results.map(function(res) {
            return JSON.stringify(res);
        }).join('\n');

        writeData(results);
        return done(null, 'Finished - ' + count + ' matched');
    } else return done(null, results);
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
