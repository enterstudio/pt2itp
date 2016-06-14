var convert = require('../lib/convert');
var test = require('tape');

test('Feature - no args', function(t) {
    convert(null, function(err) {
        t.equals(err.toString(), 'Error: options object required');
        t.end();
    });
});

test('Feature - no input', function(t) {
    convert({
        output: true
    }, function(err) {
        t.equals(err.toString(), 'Error: input path required');
        t.end();
    });
});

test('Feature - no output', function(t) {
    convert({
        input: true
    }, function(err) {
        t.equals(err.toString(), 'Error: output path required');
        t.end();
    });
});

