const tokenize = require('../lib/tokenize');
const test = require('tape');
const fs = require('fs');

test('tokenizes basic strings', (t) => {
    t.deepEqual(tokenize('foo'), ['foo']);
    t.deepEqual(tokenize('foo bar'), ['foo', 'bar']);
    t.deepEqual(tokenize('foo-bar'), ['foo', 'bar'], 'splits on - (non-numeric)');
    t.deepEqual(tokenize('foo+bar'), ['foo', 'bar'], 'splits on +');
    t.deepEqual(tokenize('foo_bar'), ['foo', 'bar'], 'splits on _');
    t.deepEqual(tokenize('foo:bar'), ['foo', 'bar'], 'splits on :');
    t.deepEqual(tokenize('foo;bar'), ['foo', 'bar'], 'splits on ;');
    t.deepEqual(tokenize('foo|bar'), ['foo', 'bar'], 'splits on |');
    t.deepEqual(tokenize('foo}bar'), ['foo', 'bar'], 'splits on }');
    t.deepEqual(tokenize('foo{bar'), ['foo', 'bar'], 'splits on {');
    t.deepEqual(tokenize('foo[bar'), ['foo', 'bar'], 'splits on [');
    t.deepEqual(tokenize('foo]bar'), ['foo', 'bar'], 'splits on ]');
    t.deepEqual(tokenize('foo(bar'), ['foo', 'bar'], 'splits on (');
    t.deepEqual(tokenize('foo)bar'), ['foo', 'bar'], 'splits on )');
    t.deepEqual(tokenize('foo b.a.r'), ['foo', 'bar'], 'collapses .');
    t.deepEqual(tokenize('foo\'s bar'), ['foos', 'bar'], 'collapses apostraphe');
    t.deepEqual(tokenize('69-150'), ['69-150']);
    t.deepEqual(tokenize('4-10'), ['4-10']);
    t.deepEqual(tokenize('5-02A'), ['5-02a']);
    t.deepEqual(tokenize('23-'), ['23']);
    t.deepEqual(tokenize('San José'), ['san', 'josé']);
    t.deepEqual(tokenize('Chamonix-Mont-Blanc'), ['chamonix','mont','blanc']);
    t.deepEqual(tokenize('Москва'), ['москва']);
    t.deepEqual(tokenize('京都市'), ['京都市']);
    t.end();
});

test('Uses replacement tokens', (t) => {
    t.deepEqual(tokenize('foo', null), ['foo'], 'handles null token replacer');
    t.deepEqual(tokenize('foo', {}), ['foo'], 'handles empty args');
    t.deepEqual(tokenize('foo', { tokens: [] }), ['foo'], 'handles empty tokens array');
    t.deepEqual(tokenize('barter', { 'barter': 'foo' }), ['foo'], 'basic single replacement');
    t.end();
});

test('edge cases - empty string', (t) => {
    t.deepEqual(tokenize(''), []);
    t.end();
});

