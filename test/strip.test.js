const strip = require('../lib/strip');
const test = require('tape');
const path = require('path');
const os = require('os');

test('Strip - no args', (t) => {
    strip(null, (err) => {
        t.equals(err.toString(), 'Error: options object required');
        t.end();
    });
});

test('Strip - Address Points', (t) => {
    strip({
        input: path.resolve(__dirname, 'fixtures/convert.FeatureCollection'),
        output: path.resolve(os.tmpdir(), 'convert.FeatureCollection.json')
    }, (err) => {
        t.error(err);

        let res = require(path.resolve(os.tmpdir(), 'convert.FeatureCollection.json'));

        t.equals(res.type, 'FeatureCollection');
        t.equals(res.features.length, 24);

        res.features.forEach((feat) => {
            t.equals(feat.type, 'Feature');
        });

        t.end();
    });
});
