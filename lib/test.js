const fs = require('fs');
const Carmen = require('@mapbox/carmen');
const queue = require('d3-queue').queue;

const index = require('../node_modules/@mapbox/carmen/lib/index.js');
const mem = require('../node_modules/@mapbox/carmen/lib/api-mem.js');
const addFeature = require('../node_modules/@mapbox/carmen/lib/util/addfeature.js');

//Use raw addresses to query generated ITP output to check for completeness
module.exports = function(argv) {
    if (!argv['addresses'] && !argv['query']) {
        console.error('--addresses=<FILE.geojson> or --query="QUERY" argument required');
        process.exit(1);
    } else if (!argv['itp']) {
        console.error('--itp=<FILE.geojson> argument required');
        process.exit(1);
    } else if (argv['addresses'] && argv['query']) {
        console.error('--addresses & --query cannot be used together');
        process.exit(1);
    }

    let conf = {
        address: new mem({maxzoom: 12, geocoder_address: 1 }, function() {})
    };
    let c = new Carmen(conf);

    let addresses;

    if (argv['addresses']) {
        addresses = String(fs.readFileSync(__dirname + '/../' + argv['addresses'])).split('\n');
    } else {
        addresses = [ argv['query'] ];
    }

    let featQ = queue()
    let carmenQ = queue();
    let itp = String(fs.readFileSync(__dirname + '/../' + argv['itp'])).split('\n');

    //Don't mark duplicate geocodes as 2 failures
    let geocodeHistory = [];

    console.error('ok - Indexing ITP Data');

    itp.map(function(a) {
        try {
            obj = JSON.parse(a);
        } catch (err) {
            obj = false;
        }

        if (obj) {
            featQ.defer(function(obj, done) {
                addFeature(conf.address, obj, done);
            }, obj);
        }
        return obj;
    });

    featQ.awaitAll(function() {
        console.error('ok - ITP Data Indexed');
        addresses.map(function(a) {
            let geocode;

            if (argv['addresses']) {
                try {
                    obj = JSON.parse(a);
                    geocode = String(obj.properties.number + ' ' + obj.properties.street).toLowerCase();
                } catch (err) {
                    obj = false;
                }
            } else {
                geocode = a.toLowerCase();
            }

            if (geocode) {
                if (geocodeHistory.indexOf(geocode) === -1) {
                    geocodeHistory.push(geocode);

                    carmenQ.defer(function(obj, done) {
                        c.geocode(geocode, {}, function(err, res) {
                            if (err) done(err);

                            if (!res.features[0] || res.features[0].place_name.toLowerCase() !== geocode) {
                                return done(null, geocode);
                            } else {
                                return done();
                            }
                        });
                    }, obj);
                }
            }

            return obj;
        });

        carmenQ.awaitAll(function(err, res) {
            let total = res.length;
            let bad = 0;
            res.forEach(function(a) {
                if (argv.debug && a) console.log(a);
                if (a) ++bad;
            });

            console.error(bad + '/' + total + '(~'+ Math.round(bad/total * 100) +'%) failed to geocode');
        });
    });
}
