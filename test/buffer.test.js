var buffer = require('../lib/buffer');
var test = require('tape');
var fs = require('fs');

test('Not LineString', function(t) {
    t.throws(function () {
        buffer({
            type: 'Point'
        }, 1);
    });
    t.end();
});

test('Feature Not LineString', function(t) {
    t.throws(function () {
        buffer({
            type: 'Feature',
            geometry: {
                type: 'Point'
            }
        }, 1);
    });
    t.end();
});

test('Simple Buffer', function(t) {
    var res = buffer({
        type: 'LineString',
        coordinates: [ [ 153.02594661712646, -27.391440164073067 ], [ 153.0263113975525, -27.389068173784242 ] ]
    }, 0.1);

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/buffer.simple.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/buffer.simple.json');
    t.deepEquals(round(res), round(fixture));
    t.end();
});

test('Curved Buffer', function(t) {
    var res = buffer({
        type: 'LineString',
        coordinates: [ [ 153.07570695877075, -27.40829030881894 ], [ 153.0749773979187, -27.40728070601844 ], [ 153.07459115982056, -27.406309192727935 ], [ 153.07450532913205, -27.4051852745398 ], [ 153.0747628211975, -27.404251842271073 ], [ 153.07544946670532, -27.40328030235277 ], [ 153.07673692703247, -27.402118253194587 ], [ 153.07798147201538, -27.400822839731696 ] ]
    }, 0.1);

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/buffer.curved.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/buffer.curved.json');
    t.deepEquals(round(res), round(fixture));
    t.end();
});

test('Self Intersection Buffer', function(t) {
    var res = buffer({
        type: 'LineString',
        coordinates: [ [ 153.1377410888672, -27.43975481153899 ], [ 153.13806295394897, -27.43916445850902 ], [ 153.13825607299805, -27.438764540145915 ], [ 153.13852429389954, -27.43852649281313 ], [ 153.13907146453857, -27.438364620333505 ], [ 153.13945770263672, -27.43860266801549 ], [ 153.1396508216858, -27.438878802683266 ], [ 153.1396508216858, -27.439440591771024 ], [ 153.1394898891449, -27.439935725544963 ], [ 153.13918948173523, -27.44044037883604 ], [ 153.13864231109616, -27.440773639178037 ], [ 153.13838481903076, -27.441078333467036 ], [ 153.13820242881775, -27.441487765092976 ], [ 153.13807368278503, -27.441925760034128 ], [ 153.1379985809326, -27.442211407972078 ], [ 153.13789129257202, -27.442382796379878 ], [ 153.13789129257202, -27.442573227631872 ], [ 153.1379985809326, -27.442601792291327 ], [ 153.13815951347348, -27.442535141407763 ], [ 153.13815951347348, -27.442306623787058 ], [ 153.13801735639572, -27.442211407972078 ] ]
    }, 0.1);

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/buffer.si.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    var fixture = require('./fixtures/buffer.si.json');
    t.deepEquals(round(res), round(fixture));
    t.end();
});

function round(poly) {
    poly.geometry.coordinates.map(function(poly) {
        return poly.map(function(coords) {
            return coords.map(function(coord) {
                return Number((coord).toFixed(5));
            });
        });
    });
}
