const freq = require('../lib/freq');
const test = require('tape');

test('freq', (t) => {

    let feats = [
        'main street se',
        'main street sw',
        'stanley road ne'
    ];

    let res = freq(feats);

    t.deepEqual(res, { _max: 2, _min: 1, main: 1, ne: 2, road: 2, se: 2, stanley: 2, street: 1, sw: 2 }, 'test result');
    t.end();
});

