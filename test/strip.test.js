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
        input: path.resolve(__dirname, 'fixtures/strip'),
        output: path.resolve(os.tmpdir(), 'strip-test.json')
    }, (err) => {
        t.error(err);

        let res = require(path.resolve(os.tmpdir(), 'strip-test.json'));

        t.equals(res.type, 'Feature');

        res.geometry.geometries.forEach((geom) => {
            t.equals(geom.type, 'MultiLineString');
        });

        t.end();
    });
});
