var turf = require('turf');
var tokenize = require('./tokenize');
var explode = require('./explode');
var det2D = require('./misc').det2D;
var sign = require('./misc').sign
var cluster = require('./cluster');
var interpolize = require('./interpolize');
var linker = require('./linker');
var streetFreq = require('./freq');
var split = require('./split');

module.exports = function(data, xyz, writeData, done) {
    if (xyz[2] !== 14) return done(null, 'Add tiles must be z14:' + xyz.join(','));
    if (data.Addresses.addresses.features.length === 0) return done(null, 'No address data in: ' + xyz.join(','));
    if (data.Streets.streets.features.length === 0) return done(null, 'No street data in: ' + xyz.join(','));

    var addresses = tokenizeFeat(cluster(data.Addresses.addresses));
    var streets = explode(tokenizeFeat(cluster(data.Streets.streets)));

    if (xyz[0] !== 4683 || xyz[1] !== 6264) {
        return done();
    }

    var nameFreq = streetFreq(streets, addresses);
    var link = linker(nameFreq, streets, addresses);
    
    if (!link.link) return done(null, 'No links found in: ' + xyz.join(','));

    var street_keys = Object.keys(link.link);
    var results = [];

    function itp(street_keys_it) {
        var streetID = link.dups.forward[street_keys[street_keys_it]];

          
        var newStreet = [];
        if (link.dups.reverse[streetID].length > 1) {
            split(streets, addresses.features[link.link[street_keys[street_keys_it]]], link.dups.reverse[streetID], xyz, function(err, res) {
                Object.keys(res).forEach(function(addrCluster_it, street_it) {
                    var tmpStreet = interpolize(streets.features[street_it], res[addrCluster_it], global.mapOptions);
                    results.push(tmpStreet);

                    newStreet.push(JSON.stringify(tmpStreet));
                });
            });
        } else {
            var tmpStreet = interpolize(streets.features[street_keys[street_keys_it]], addresses.features[link.link[street_keys[street_keys_it]]], global.mapOptions);
            results.push(tmpStreet);

            newStreet.push(JSON.stringify(tmpStreet));
        }

        if (writeData) { writeData(JSON.stringify(newStreet.join('\n')) + '\n'); } 

        if (street_keys_it + 1 < street_keys.length) return itp(street_keys_it + 1);
        else return report();
    }
    
    if (street_keys.length) itp(0);
    else report();

    function report() {
        if (writeData) return done(null, 'Finished - ' + results.length + ' matched');
        else return done(null, results);
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
