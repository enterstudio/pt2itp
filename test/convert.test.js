const convert = require('../lib/convert');
const test = require('tape');
const os = require('os');

test('Convert - no args', (t) => {
    convert(null, (err) => {
        t.equals(err.toString(), 'Error: options object required');
        t.end();
    });
});

test('Convert - FeatureCollection', (t) => {
    convert({
        input: __dirname + '/fixtures/convert.FeatureCollection',
        output: os.tmpdir() + '/' + 'convert.FeatureCollection.json'
    }, (err) => {
        t.error(err);

        let res = require(os.tmpdir() + '/' + 'convert.FeatureCollection.json');

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 24);

        res.features.forEach((feat) => {
            t.equals(feat.type, 'Feature');
        });

        t.end();
    });
});

test('Convert - Feature', (t) => {
    convert({
        input: __dirname + '/fixtures/convert.Feature',
        output: os.tmpdir() + '/' + 'convert.Feature.json'
    }, (err) => {
        t.error(err);

        let res = require(os.tmpdir() + '/' + 'convert.Feature.json');

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 10);

        res.features.forEach((feat) => {
            t.equals(feat.type, 'Feature');
        });

        t.end();
    });
});

test('Convert - Raw', (t) => {
    convert({
        input: __dirname + '/fixtures/convert.Raw',
        output: os.tmpdir() + '/' + 'convert.Raw.json'
    }, (err) => {
        t.error(err);

        let res = require(os.tmpdir() + '/' + 'convert.Raw.json');

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 10);

        res.features.forEach((feat) => {
            t.equals(feat.type, 'Feature');
        });

        t.end();
    });
});
