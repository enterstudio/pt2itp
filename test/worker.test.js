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
            t.equal(res.toString(), 'No address data in: 1,1,1');
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
        }, [1,1,1], null, function(err, res) {
            t.equal(res.toString(), 'No street data in: 1,1,1');
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
                ['lstart', 'lend', 'rstart', 'rend'].forEach(function(key){
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
                }, [1,1,1], null, function(err, res) {
                    t.error(err);
                    t.equal(res[0].properties.lparity, streetFixture.properties.lparity, 'lparity matched');
                    t.equal(res[0].properties.lstart, streetFixture.properties.lstart ? parseInt(streetFixture.properties.lstart) : null, 'lstart matched');
                    t.equal(res[0].properties.lend, streetFixture.properties.lend ? parseInt(streetFixture.properties.lend) : null, 'lend matched');
                    t.equal(res[0].properties.rparity, streetFixture.properties.rparity, 'rparity matched');
                    t.equal(res[0].properties.rstart, streetFixture.properties.rstart ? parseInt(streetFixture.properties.rstart) : null, 'rstart matched');
                    t.equal(res[0].properties.rend, streetFixture.properties.rend ? parseInt(streetFixture.properties.rend) : null, 'rend matched');
                    q.end();    
                });
            });
        })(fixture);
    });
    t.end();
});
