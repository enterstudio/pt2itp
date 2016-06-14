var convert = require('../lib/convert');
var test = require('tape');

test('Feature', function(t) {
    convert(null, function(err) {
        t.equals(err.toString(), 'Error: options object required')
        t.end();
    });
});

