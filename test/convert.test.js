var convert = require('../lib/convert');
var test = require('tape');
var os = require('os');

test('Convert - no args', function(t) {
    convert(null, function(err) {
        t.equals(err.toString(), 'Error: options object required');
        t.end();
    });
});

test('Convert - no input', function(t) {
    convert({
        output: true
    }, function(err) {
        t.equals(err.toString(), 'Error: input path required');
        t.end();
    });
});

test('Convert - no output', function(t) {
    convert({
        input: true
    }, function(err) {
        t.equals(err.toString(), 'Error: output path required');
        t.end();
    });
});

test('Convert - FeatureCollection', function(t) {
    convert({
        input: __dirname + '/fixtures/convert.FeatureCollection',
        output: os.tmpdir() + '/' + 'convert.FeatureCollection.json'
    }, function(err) {
        t.error(err);  

        var res = require(os.tmpdir() + '/' + 'convert.FeatureCollection.json');

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 24);

        res.features.forEach(function(feat) {
            t.equals(feat.type, 'Feature');
        });
        
        t.end();
    });
});

test('Convert - Feature', function(t) {
    convert({
        input: __dirname + '/fixtures/convert.Feature',
        output: os.tmpdir() + '/' + 'convert.Feature.json'
    }, function(err) {
        t.error(err);  

        var res = require(os.tmpdir() + '/' + 'convert.Feature.json');

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 10);

        res.features.forEach(function(feat) {
            t.equals(feat.type, 'Feature');
        });
        
        t.end();
    });
});
