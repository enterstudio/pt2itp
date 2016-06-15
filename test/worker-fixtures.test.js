var worker = require('../lib/worker');
var test = require('tape');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

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
                    ['carmen:rparity', 'carmen:lparity', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:rfromhn', 'carmen:rtohn'].forEach(function(key){
                        delete inputStreets[street_it].properties[key]; 
                    });
                });

                var addresses = fixtures.features.filter(function(fixture) {
                    console.log(fixture)
                    if (fixture.properties.address) return true;
                    else return false;
                }).map(function(fixture) {
                    if (fixture.properties.address) fixture.properties.number = fixture.properties.address;
                    return fixture;
                });

                worker({
                    Addresses: {
                        addresses: turf.featurecollection(addresses)
                    },
                    Streets: {
                        streets: turf.featurecollection(inputStreets)
                    }
                }, [1,1,14], null, function(err, res) {
                    t.error(err);

                    console.log(res)

                    t.equal(res[0].properties['carmen:lparity'], streetFixtures.properties['carmen:lparity'], 'lparity matched');
                    t.equal(res[0].properties['carmen:lfromhn'], streetFixtures.properties['carmen:lfromhn'] ? parseInt(streetFixture.properties['carmen:lfromhn']) : null, 'lstart matched');
                    t.equal(res[0].properties['carmen:ltohn'], streetFixtures.properties['carmen:ltohn'] ? parseInt(streetFixture.properties['carmen:ltohn']) : null, 'lend matched');
                    t.equal(res[0].properties['carmen:rparity'], streetFixtures.properties['carmen:rparity'], 'rparity matched');
                    t.equal(res[0].properties['carmen:rfromhn'], streetFixtures.properties['carmen:rfromhn'] ? parseInt(streetFixture.properties['carmen:rfromhn']) : null, 'rstart matched');
                    t.equal(res[0].properties['carmen:rtohn'], streetFixtures.properties['carmen:rtohn'] ? parseInt(streetFixture.properties['carmen:rtohn']) : null, 'rend matched');
                    q.end();    
                });
            });
        })(fixture);
    });
    t.end();
});
