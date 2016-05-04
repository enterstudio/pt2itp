//INCOMPLETE!!!//

var freq = require('../lib/freq');
var turf = require('turf');
var test = require('tape');
var linker = require('../lib/linker');
var tokenize = require('../lib/tokenize');

test('linker - exact match', function(t) {
    var streets = genFeat([
        'main street se',
    ]);
    var addresses = genFeat([
        'main street se'
    ]);

    var freqs = freq(streets, addresses);

    var link = linker(freqs, streets, addresses);
    t.deepEquals(link, { dups: { forward: [ 'main,street,se' ], process: [ 0 ], reverse: { 'main,street,se': [ 0 ] } }, link: { 0: 0 } });

    t.end();
});

test('linker - cardinals', function(t) {
    var streets = genFeat([
        'main street se'
    ]);
    var addresses = genFeat([
        'main street ne'
    ]);

    var freqs = freq(streets, addresses);

    var link = linker(freqs, streets, addresses);
    t.deepEquals(link, { dups: { forward: [ 'main,street,se' ], process: [ 0 ], reverse: { 'main,street,se': [ 0 ] } }, link: { 0: 0 } });

    t.end();
});

test('linker - misc', function(t) {
    var streets = genFeat([
        'main street west',
        'main street east'
    ]);
    var addresses = genFeat([
        'main street east'
    ]);

    var freqs = freq(streets, addresses);

    var link = linker(freqs, streets, addresses);
    t.deepEquals(link, { dups: { forward: [ 'main,street,west', 'main,street,east' ], process: [ 0, 1 ], reverse: { 'main,street,east': [ 1 ], 'main,street,west': [ 0 ] } }, link: { 1: 0 } });

    t.end();
});



function genFeat(streets) {
    var feats = streets.map(function(street) {
        return turf.point([0,0], {
            street: tokenize(street)
        });
    })
    return feats = turf.featurecollection(feats);
}
