var fs = require('fs');
var Carmen = require('carmen');
var queue = require('d3-queue').queue;

var index = require('../node_modules/carmen/lib/index.js');
var mem = require('../node_modules/carmen/lib/api-mem.js');
var addFeature = require('../node_modules/carmen/lib/util/addfeature.js');

//Use raw addresses to query generated ITP output to check for completeness
module.exports = function(argv) {
    if (!argv['addresses']) {
        console.error('--addresses=<FILE.geojson> argument required');
        process.exit(1);
    } else if (!argv['itp']) {
        console.error('--itp=<FILE.geojson> argument required');
        process.exit(1);
    }

    var conf = {
        address: new mem({maxzoom: 6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);

    var addresses = String(fs.readFileSync(__dirname + '/../' + argv['addresses'])).split('\n');

    var featQ = queue()
    var carmenQ = queue();
    var itp = String(fs.readFileSync(__dirname + '/../' + argv['itp'])).split('\n');
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
        addresses.map(function(a) {
            try {
                obj = JSON.parse(a);
            } catch (err) {
                obj = false;
            }

            if (obj) {
                carmenQ.defer(function(obj, done) {
                    //obj.properties.number + ' ' + obj.properties.street
                    c.geocode(obj.properties.number + ' ' + obj.properties.street, {}, function(err, res) {
                        if (err) done(err);

                        if (!res.features[0] || res.features[0].place_name.toLowerCase() !== String(obj.properties.number + ' ' + obj.properties.street).toLowerCase()) {
                            return done(null, String(obj.properties.number + ' ' + obj.properties.street));
                        } else {
                            return done();
                        }
                    });
                }, obj);
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

            console.log(bad + '/' + total + '(~'+ Math.round(total/bad) +'%) failed to geocode');
        });
    });
}
