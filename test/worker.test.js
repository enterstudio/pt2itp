var worker = require('../lib/worker');
var test = require('tape');

test('worker - no addresses', function(t) {
    worker({
        Addresses: {
            addresses: { 
                features: []
            }
        }
    }, [1,1,1], null, function(err, res) {
        t.equal(err.toString(), 'Error: No address data in: 1,1,1');
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
        t.equal(err.toString(), 'Error: No street data in: 1,1,1');
        t.end();    
    });
});

