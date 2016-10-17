var fs = require('fs');
var Carmen = require('carmen');
var queue = require('d3-queue').queue;

var index = require('../node_modules/carmen/lib/index.js');
var mem = require('../node_modules/carmen/lib/api-mem.js');
var addFeature = require('../node_modules/carmen/lib/util/addfeature.js');

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

    var conf = {
        address: new mem({maxzoom: 12, geocoder_address: 1 }, function() {})
    };
    var c = new Carmen(conf);

    var addresses;

    if (argv['addresses']) {
        addresses = String(fs.readFileSync(__dirname + '/../' + argv['addresses'])).split('\n');
    } else {
        addresses = [ argv['query'] ];
    }

    var featQ = queue()
    var carmenQ = queue();
    var itp = String(fs.readFileSync(__dirname + '/../' + argv['itp'])).split('\n');

    //Don't mark duplicate geocodes as 2 failures
    var geocodeHistory = [];

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
            var geocode;

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
            var total = res.length;
            var bad = 0;
            res.forEach(function(a) {
                if (argv.debug && a) console.log(a);
                if (a) ++bad;
            });

            console.error(bad + '/' + total + '(~'+ Math.round(bad/total * 100) +'%) failed to geocode');
        });
    });
}
