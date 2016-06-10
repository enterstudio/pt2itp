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
var path = require('path');

module.exports = function(data, xyz, writeData, done) {
    if (!global.mapOptions) global.mapOptions = {};

    if (global.mapOptions.map) {
        remap = require(__dirname + '/../' + global.mapOptions.map);
        data = remap.map(data, global.mapOptions);
    }

    if (!global.mapOptions.zoom) {
        global.mapOptions.zoom =  xyz[2];
    }

    if (!data.Addresses.addresses || !data.Addresses.addresses.features || data.Addresses.addresses.features.length === 0) return done(null, 'No address data in: ' + xyz.join(','));
    if (!data.Streets.streets || !data.Streets.streets.features || data.Streets.streets.features.length === 0) return done(null, 'No street data in: ' + xyz.join(','));

    if (global.mapOptions.raw === 'addresses') {
        data.Addresses.addresses.features.forEach(function(addr) {
            writeData(JSON.stringify(addr) + '\n');
        });
        return done(null, 'dumped: ' + xyz.join(','));
    } else if (global.mapOptions.raw === 'streets') {
        data.Streets.streets.features.forEach(function(street) {
            writeData(JSON.stringify(street) + '\n');
        });
        return done(null, 'dumped: ' + xyz.join(','));

    }

    var addresses = cluster(tokenizeFeat(data.Addresses.addresses));
    var streets = explode(cluster(tokenizeFeat(data.Streets.streets)));

    var nameFreq = streetFreq(streets, addresses);
    var link = linker(nameFreq, streets, addresses);

    if (!link.link) return done(null, 'No links found in: ' + xyz.join(','));

    var street_keys = link.dups.process;
    var results = [];

    function itp(street_keys_it) {
        var streetID = link.dups.forward[street_keys[street_keys_it]];
        var newStreet = [];
        if (link.dups.reverse[streetID].length > 1 && addresses.features[link.link[street_keys[street_keys_it]]]) { //Single address cluster needs to be divied amongst multiple street segments w/ same name
            split(streets, addresses.features[link.link[street_keys[street_keys_it]]], link.dups.reverse[streetID], xyz, function(err, res) {
                Object.keys(res).forEach(function(id_it) {
                    var tmpStreet = interpolize(streets.features[id_it], res[id_it], global.mapOptions);
                    results.push(tmpStreet);

                    newStreet.push(JSON.stringify(tmpStreet));
                });
                return writeITP();
            });
        } else if (link.link[street_keys[street_keys_it]] !== null && link.link[street_keys[street_keys_it]] !== undefined) { //Single address cluster matches single street seg
            var tmpStreet = interpolize(streets.features[street_keys[street_keys_it]], addresses.features[link.link[street_keys[street_keys_it]]], global.mapOptions);
            results.push(tmpStreet);

            newStreet.push(JSON.stringify(tmpStreet));
            return writeITP();
        } else { //No match
            return writeITP();
        }

        function writeITP() {
            if (writeData && newStreet.length > 0) { writeData(newStreet.join('\n') + '\n'); } 

            if (street_keys_it + 1 < street_keys.length) return itp(street_keys_it + 1);
            else return report();
        }
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
            feat.properties['carmen:text'] = feat.properties.street;
            feat.properties.street = tokenize(feat.properties.street, global.mapOptions);
        } else {
            feat.properties.street = [];
        }
        return feat;
    });
    return feats;
}
