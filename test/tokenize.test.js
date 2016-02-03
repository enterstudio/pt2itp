var tokenize = require('../lib/tokenize');
var test = require('tape');

test('tokenizes basic strings', function(assert) {
    assert.deepEqual(tokenize('foo'), ['foo']);
    assert.deepEqual(tokenize('foo bar'), ['foo', 'bar']);
    assert.deepEqual(tokenize('foo-bar'), ['foo', 'bar'], 'splits on - (non-numeric)');
    assert.deepEqual(tokenize('foo+bar'), ['foo', 'bar'], 'splits on +');
    assert.deepEqual(tokenize('foo_bar'), ['foo', 'bar'], 'splits on _');
    assert.deepEqual(tokenize('foo:bar'), ['foo', 'bar'], 'splits on :');
    assert.deepEqual(tokenize('foo;bar'), ['foo', 'bar'], 'splits on ;');
    assert.deepEqual(tokenize('foo|bar'), ['foo', 'bar'], 'splits on |');
    assert.deepEqual(tokenize('foo}bar'), ['foo', 'bar'], 'splits on }');
    assert.deepEqual(tokenize('foo{bar'), ['foo', 'bar'], 'splits on {');
    assert.deepEqual(tokenize('foo[bar'), ['foo', 'bar'], 'splits on [');
    assert.deepEqual(tokenize('foo]bar'), ['foo', 'bar'], 'splits on ]');
    assert.deepEqual(tokenize('foo(bar'), ['foo', 'bar'], 'splits on (');
    assert.deepEqual(tokenize('foo)bar'), ['foo', 'bar'], 'splits on )');
    assert.deepEqual(tokenize('foo b.a.r'), ['foo', 'bar'], 'collapses .');
    assert.deepEqual(tokenize('foo\'s bar'), ['foos', 'bar'], 'collapses apostraphe');
    assert.deepEqual(tokenize('69-150'), ['69-150']);
    assert.deepEqual(tokenize('4-10'), ['4-10']);
    assert.deepEqual(tokenize('5-02A'), ['5-02a']);
    assert.deepEqual(tokenize('23-'), ['23']);
    assert.deepEqual(tokenize('San José'), ['san', 'josé']);
    assert.deepEqual(tokenize('Chamonix-Mont-Blanc'), ['chamonix','mont','blanc']);
    assert.deepEqual(tokenize('Москва'), ['москва']);
    assert.deepEqual(tokenize('京都市'), ['京都市']);
    assert.end();
});
test('edge cases - empty string', function(assert) {
    assert.deepEqual(tokenize(''), []);
    assert.end();
});

