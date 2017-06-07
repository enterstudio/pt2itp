const test = require('tape');
const misc = require('../lib/misc');

test('misc.det2D', (t) => {
    t.equal(misc.det2D([0,0], [1,2], [3,4]), -2);
    t.equal(misc.det2D([0,0], [2,1], [-1,3]), 7);
    t.equal(misc.det2D([1,1], [0,1], [2,3]), -2);
    t.equal(misc.det2D([2,2], [0,-1], [-3,1]), -13);
    t.end();
});

test('misc.sign', (t) => {
    t.equal(misc.sign(5), 1);
    t.equal(misc.sign(-5), -1);
    t.equal(misc.sign(0), 0);
    t.end();
});


test('misc.id', (t) => {
    let id = misc.id({
        properties: {
            'carmen:center': [123.463215, 63.763234351]
        }
    });

    t.equals(id.id, 6321534351);

    id = misc.id({
        properties: {
            'carmen:center': [15, 51]
        }
    });

    t.equals(id.id, 1551);

    id = misc.id({
        properties: {
            'carmen:center': [-15, 51]
        }
    });

    t.equals(id.id, 1551);
    t.end();
});
