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
        }, [1,1,1], null, function(err, res) {
            t.equal(res.toString(), 'Add tiles must be z14:1,1,1');
            t.end();    
        });
    });

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

                var streetFixture = fixtures.features.filter(function(fixture) {
                    if (fixture.properties.address) return false;
                    else if (fixture.geometry.type === 'Point') return false;
                    else return true;
                })[0];

                var street = _.cloneDeep(streetFixture);
                ['carmen:lfromhn', 'carmen:ltohn', 'carmen:rfromhn', 'carmen:rtohn'].forEach(function(key){
                    delete street.properties[key]; 
                });

                var addresses = fixtures.features.filter(function(fixture) {
                    if (fixture.properties.address) return true;
                    else return false;
                }).map(function(fixture) {
                    if (!fixture.properties.street) fixture.properties.street = street.properties.street; 
                    if (fixture.properties.address) fixture.properties.number = fixture.properties.address;
                    return fixture;
                });

                worker({
                    Addresses: {
                        addresses: turf.featurecollection(addresses)
                    },
                    Streets: {
                        streets: turf.featurecollection([street])
                    }
                }, [1,1,14], null, function(err, res) {
                    t.error(err);
                    t.equal(res[0].properties['carmen:lparity'], streetFixture.properties['carmen:lparity'], 'lparity matched');
                    t.equal(res[0].properties['carmen:lfromhn'], streetFixture.properties['carmen:lfromhn'] ? parseInt(streetFixture.properties['carmen:lfromhn']) : null, 'lstart matched');
                    t.equal(res[0].properties['carmen:ltohn'], streetFixture.properties['carmen:ltohn'] ? parseInt(streetFixture.properties['carmen:ltohn']) : null, 'lend matched');
                    t.equal(res[0].properties['carmen:rparity'], streetFixture.properties['carmen:rparity'], 'rparity matched');
                    t.equal(res[0].properties['carmen:rfromhn'], streetFixture.properties['carmen:rfromhn'] ? parseInt(streetFixture.properties['carmen:rfromhn']) : null, 'rstart matched');
                    t.equal(res[0].properties['carmen:rtohn'], streetFixture.properties['carmen:rtohn'] ? parseInt(streetFixture.properties['carmen:rtohn']) : null, 'rend matched');
                    q.end();    
                });
            });
        })(fixture);
    });
    t.end();
});
