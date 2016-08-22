var test = require('tape');
var interpolize = require('../lib/interpolize');
var turf = require('turf');
var fs = require('fs');

test('LSB forward', function(t) {
    var LSB = interpolize.lsb(
        [-79.37625288963318,38.83449282408381],
        [-79.37467575073241,38.83594698648804]
    )
    t.equal(LSB, 1);
    t.end();
});

test('LSB reverse', function(t) {
    var LSB = interpolize.lsb(
        [-79.37467575073241,38.83594698648804],
        [-79.37625288963318,38.83449282408381]
    )
    t.equal(LSB, 1);
    t.end();
});

test('segments', function(t) {
    var seg = interpolize.segment(
        {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": [ [ -77.00275003910065, 38.963765608971286 ], [ -77.00335085391998, 38.963765608971286 ], [ -77.00378805398941, 38.9637697800411 ] ]
              }
        },
        0.01,
        'kilometers'
    )
    t.deepEquals(seg, [ [ -77.00275003910065, 38.963765608971286 ], [ -77.00335085391998, 38.963765608971286 ] ]);
    t.end();
});

test('Interpolize - Missing args', function(t) {
    t.throws(function() {
        var res = interpolize(null, null, null);
    }, /argv required/, 'did not throw with expected message');
    t.end();
});

test('Interpolize - Missing zoom', function(t) {
    t.throws(function() {
        var res = interpolize(null, null, {});
    }, /argv\.zoom required/, 'did not throw with expected message');
    t.end();
});

test('Interpolize', function(t) {
    var street = {
        type: "Feature",
        properties: { street: "Battleridge Place" },
        geometry: {
            type: "LineString",
            coordinates: [
                [-77.21062123775481,39.17687343078357],
                [-77.21064805984497,39.1773849237293]
            ]
        }
    }

    var address = {
        type: "Feature",
        properties: {
            street: "Battleridge Place",
            numbers: ["8","10","9","11"]
        },
        geometry: {
            type: "MultiPoint",
            coordinates: [
                [-77.21054881811142,39.1769482836422],
                [-77.21056759357452,39.17731007133552],
                [-77.2107258439064,39.176966996844406],
                [-77.21077680587769,39.177320467506085]
            ]
        }
    }

    var res = interpolize(street, address, {zoom: 14});
    t.deepEquals(res.properties, {
        'carmen:text': 'Battleridge Place',
        'carmen:center': [ -77.2106346487999, 39.17712917725643 ],
        'carmen:rangetype': 'tiger',
        'carmen:parityl': 'O',
        'carmen:lfromhn': '9',
        'carmen:ltohn': '11',
        'carmen:parityr': 'E',
        'carmen:rfromhn': '8',
        'carmen:rtohn': '10'
    }, 'has expected properties');
    t.end();
});

test('Interpolize - DEBUG', function(t) {
    var street = {
        type: "Feature",
        properties: {
            street: ["Battleridge", "Place"],
            'carmen:text': 'Battleridge Place'
        },
        geometry: {
            type: "LineString",
            coordinates: [
                [-77.21062123775481,39.17687343078357],
                [-77.21064805984497,39.1773849237293]
            ]
        }
    }

    var address = {
        type: "Feature",
        properties: {
            street: ["Battleridge", "Place"],
            numbers: ["8","10","9","11"]
        },
        geometry: {
            type: "MultiPoint",
            coordinates: [
                [-77.21054881811142,39.1769482836422],
                [-77.21056759357452,39.17731007133552],
                [-77.2107258439064,39.176966996844406],
                [-77.21077680587769,39.177320467506085]
            ]
        }
    }

    var res = interpolize(street, address, { debug: true, zoom: 14 });

    res.features.forEach(function(sng_feat, sng_feat_it) {
        if (!res.features[sng_feat_it].properties.address) {
            if (res.features[sng_feat_it].geometry.type === 'LineString') {
                t.ok(res.features[sng_feat_it].id, sng_feat_it + ' has id field');
                delete res.features[sng_feat_it].id;
            }
        }
    });

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itpdebug.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itpdebug.json'));
    t.end();
});

test('Interpolize - Addr past line end', function(t) {
    var street = {
        type: "Feature",
        properties: {
            street: ["Battleridge", "Place"],
            'carmen:text': 'Battleridge Place'
        },
        geometry: {
            type: "LineString",
            coordinates: [
                [-77.21062123775481,39.17687343078357],
                [-77.21064805984497,39.1773849237293]
            ]
        }
    }

    var address = {
        type: "Feature",
        properties: {
            street: ["Battleridge", "Place"],
            numbers: ["8","10","9","11","13","12"]
        },
        geometry: {
            type: "MultiPoint",
            coordinates: [
                [-77.21054881811142,39.1769482836422],
                [-77.21056759357452,39.17731007133552],
                [-77.2107258439064,39.176966996844406],
                [-77.21077680587769,39.177320467506085],
                [ -77.21077412366867,39.17755334132392],
                [ -77.21056491136551,39.17757413359157 ]
            ]
        }
    }

    var res = interpolize(street, address, { debug: true, zoom: 14 });

    res.features.forEach(function(sng_feat, sng_feat_it) {
        if (!res.features[sng_feat_it].properties.address) {
            if (res.features[sng_feat_it].geometry.type === 'LineString') {
                t.ok(res.features[sng_feat_it].id, sng_feat_it + ' has id field');
                delete res.features[sng_feat_it].id;
            }
        }
    });

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itp-pastline.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itp-pastline.json'));
    t.end();
});
