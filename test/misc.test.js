var test = require('tape');
var misc = require('../lib/misc');

test('misc.det2D', function(assert) {
    assert.equal(misc.det2D([0,0], [1,2], [3,4]), -2);
    assert.equal(misc.det2D([0,0], [2,1], [-1,3]), 7);
    assert.equal(misc.det2D([1,1], [0,1], [2,3]), -2);
    assert.equal(misc.det2D([2,2], [0,-1], [-3,1]), -13);
    assert.end();
});

test('misc.sign', function(assert) {
    assert.equal(misc.sign(5), 1);
    assert.equal(misc.sign(-5), -1);
    assert.equal(misc.sign(0), 0);
    assert.end();
});
