var worker = require('../lib/worker');
var test = require('tape');
var turf = require('turf');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var cover = require('tile-cover');

//Set FIXTURE="string" and it will only run fixture(s) that match the string
//this allows you to isolate a single test if one breaks and not have to 
//scroll through a million lines of output

if (!process.env.FIXTURE) {
    test('worker - no addresses', function(t) {
        worker({
            Addresses: {
                addresses: { 
                    features: []
                }
            }
        }, [1,1,14], null, function(err, res) {
            t.equal(res.toString(), 'No address data in: 1,1,14');
            t.end();    
        });
    });

    test('worker - no streets', function(t) {
        worker({
            Addresses: {
                addresses: { 
                    features: [ 'Fake Address' ]
                }
            },
            Streets: {
                streets: {
                    features: []
                }
            }
        }, [1,1,14], null, function(err, res) {
            t.equal(res.toString(), 'No street data in: 1,1,14');
            t.end();    
        });
    });
}

test('worker - fixtures', function(t) {
    var fixtures = fs.readdirSync(path.resolve(__dirname, '..', 'test/workers'));
    fixtures.forEach(function(fixture) {
        if (process.env.FIXTURE && fixture.indexOf(process.env.FIXTURE) === -1) return;

        (function(fixture) {
            t.test('./test/workers/'+fixture, function(q) {
                var fixtures = require('./workers/' + fixture);

                var streetFixtures = fixtures.features.filter(function(fixture) {
                    if (fixture.geometry.type === 'LineString') return true;
                    else return false;
                });

                var inputStreets = _.cloneDeep(streetFixtures);
                inputStreets.forEach(function(street, street_it) {
                    delete inputStreets[street_it].id;
                    if (!inputStreets[street_it].properties.street) {
                        inputStreets[street_it].properties.street = inputStreets[street_it].properties['carmen:text'];
                    }
                    ['carmen:text', 'carmen:rangetype', 'carmen:center', 'carmen:rparity', 'carmen:lparity', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:rfromhn', 'carmen:rtohn'].forEach(function(key){
                        delete inputStreets[street_it].properties[key]; 
                    });
                });

                var addresses = fixtures.features.filter(function(fixture) {
                    if (fixture.properties.address) return true;
                    else return false;
                }).map(function(fixture) {
                    if (fixture.properties.address) fixture.properties.number = fixture.properties.address;
                    return fixture;
                });

                //Assumes all geometry in test fixture is from the same tile
                var tile = cover.tiles(inputStreets[0].geometry, {min_zoom: 12, max_zoom: 12})[0];

                worker({
                    Addresses: {
                        addresses: turf.featureCollection(addresses)
                    },
                    Streets: {
                        streets: turf.featureCollection(inputStreets)
                    }
                }, tile, null, function(err, res) {
                    q.error(err);

                    //Iterate through each input street and make sure it matches an output
                    for (var street_it = 0; street_it < streetFixtures.length; street_it++) {
                        resPass = false;

                        for (var res_it = 0; res_it < res.length; res_it++) {
                            if (res[res_it].properties['carmen:lparity'] !== streetFixtures[street_it].properties['carmen:lparity']) {
                                t.equals(streetFixtures[street_it].properties['carmen:lparity'], res[res_it].properties['carmen:lparity'], 'lparity matches');
                            }
                            if (res[res_it].properties['carmen:lfromhn'] !== (streetFixtures[street_it].properties['carmen:lfromhn'] ? parseInt(streetFixtures[street_it].properties['carmen:lfromhn']) : null)) {
                                t.equals(streetFixtures[street_it].properties['carmen:lfromhn'], res[res_it].properties['carmen:lfromhn'], 'lfromhn matches');
                            }
                            if (res[res_it].properties['carmen:rparity'] !== streetFixtures[street_it].properties['carmen:rparity']) {
                                t.equals(streetFixtures[street_it].properties['carmen:rparity'], res[res_it].properties['carmen:rparity'], 'rparity matches');
                            }
                            if (res[res_it].properties['carmen:rfromhn'] !== (streetFixtures[street_it].properties['carmen:rfromhn'] ? parseInt(streetFixtures[street_it].properties['carmen:rfromhn']) : null)) {
                                t.equals(streetFixtures[street_it].properties['carmen:rfromhn'], res[res_it].properties['carmen:rfromhn'], 'rfromhn matches');
                            }
                            if (res[res_it].properties['carmen:rtohn'] !== (streetFixtures[street_it].properties['carmen:rtohn'] ? parseInt(streetFixtures[street_it].properties['carmen:rtohn']) : null)) {
                                t.equals(streetFixtures[street_it].properties['carmen:rtohn'], res[res_it].properties['carmen:rtohn'], 'rtohn matches');
                            }
                            if (res[res_it].properties['carmen:ltohn'] !== (streetFixtures[street_it].properties['carmen:ltohn'] ? parseInt(streetFixtures[street_it].properties['carmen:ltohn']) : null)) {
                                t.equals(streetFixtures[street_it].properties['carmen:ltohn'], res[res_it].properties['carmen:ltohn'], 'ltohn matches');
                            }
                        }
                    }
                    q.end();    
                });
            });
        })(fixture);
    });
    t.end();
});
