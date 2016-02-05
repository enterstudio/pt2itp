var test = require('tape');
var interpolize = require('../lib/interpolize');
var turf = require('turf');

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

    var res = interpolize(street, address);
    t.deepEquals(res.properties, {
        street: 'Battleridge Place',
        lparity: 'O',
        lstart: '9',
        lend: '11',
        rparity: 'E',
        rstart: '8',
        rend: '10'
    });
    t.end();
});
