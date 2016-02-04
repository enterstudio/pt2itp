var test = require('tape');
var interpolize = require('../lib/interpolize');

test('Interpolize', function(t) {
    var street = {
        type: "Feature",
        properties: { street: "Battleridge Place" },
        geometry: {
            type: "LineString",
            coordinates: [
                [-77.21064805984497,39.1773849237293],
                [-77.21062123775481,39.17687343078357]
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
        lstart: '10',
        lend: '8',
        rstart: '11',
        rend: '9'
    });
    t.end();
});
