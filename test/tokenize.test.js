var tokenize = require('../lib/tokenize');
var test = require('tape');
var fs = require('fs');

test('perFeat - basic tokenization', function(t) {
    var res = tokenize.perFeat({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {
                street: 'Main Street East'
            },
            geometry: {}
        }]
    });

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/token.simple.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/token.simple.json');
    t.deepEquals(res, fixture);
    t.end();
});

test('perFeat - no street', function(t) {
    var res = tokenize.perFeat({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: {}
        }]
    });

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/token.streetless.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/token.streetless.json');
    t.deepEquals(res, fixture);
    t.end();
});

test('perFeat - alternates', function(t) {
    var res = tokenize.perFeat({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {
                street: [
                    'Highway H',
                    'Main Street',
                    'Main Street',
                    'MAIN STREET',
                    'Other Street',
                    'Fake Avenue'
                ]
            },
            geometry: {}
        }]
    });

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/token.alternates.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/token.alternates.json');
    t.deepEquals(res, fixture);
    t.end();
});

test('tokenizes basic strings', function(t) {
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

test('Uses replacement tokens', function(t) {
    t.deepEqual(tokenize('foo', null), ['foo'], 'handles null token replacer');
    t.deepEqual(tokenize('foo', {}), ['foo'], 'handles empty args');
    t.deepEqual(tokenize('foo', { tokens: [] }), ['foo'], 'handles empty tokens array');
    t.deepEqual(tokenize('barter', { 'barter': 'foo' }), ['foo'], 'basic single replacement');
    t.end();
});

test('edge cases - empty string', function(t) {
    t.deepEqual(tokenize(''), []);
    t.end();
});

