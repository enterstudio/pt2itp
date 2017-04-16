const freq = require('../lib/freq');
const turf = require('@turf/turf');
const test = require('tape');
const _ = require('lodash');

test('freq', (t) => {

    let feats = [
        'main street se',
        'main street sw',
        'stanley road ne'
    ];

    let res = freq(_.clone(feats), _.clone(feats));

    t.deepEqual(res, { _max: 4, _min: 1, main: 1, ne: 2, road: 2, se: 2, stanley: 2, street: 1, sw: 2 }, 'test result');
    t.end();
});

