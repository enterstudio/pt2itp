const test = require('tape');
const interpolize = require('../lib/interpolize');
const turf = require('@turf/turf');
const fs = require('fs');

test('Drop Low', (t) => {
    let d;

    d = interpolize.diff(22, 96);
    t.equals(interpolize.dropLow(22, d), 0);

    d = interpolize.diff(22, 10044);
    t.equals(interpolize.dropLow(22, d), 0);

    d = interpolize.diff(22, 246432642);
    t.equals(interpolize.dropLow(22, d), 0);

    d = interpolize.diff(105, 109);
    t.equals(interpolize.dropLow(105, d), 101);

    d = interpolize.diff(1246, 1948);
    t.equals(interpolize.dropLow(1246, d), 1000);

    d = interpolize.diff(1246, 42354264);
    t.equals(interpolize.dropLow(1246, d), 0);

    t.end();
});

test('Raise High', (t) => {
    let d;

    d = interpolize.diff(22, 96);
    t.equals(interpolize.raiseHigh(96, d), 100);

    d = interpolize.diff(22, 10044);
    t.equals(interpolize.raiseHigh(10044, d), 20000);

    d = interpolize.diff(22, 246432642);
    t.equals(interpolize.raiseHigh(246432642, d), 300000000);

    d = interpolize.diff(105, 109);
    t.equals(interpolize.raiseHigh(109, d), 111);

    d = interpolize.diff(1246, 1948);
    t.equals(interpolize.raiseHigh(1948, d), 2000);

    d = interpolize.diff(1246, 42354264);
    t.equals(interpolize.raiseHigh(42354264, d), 100000000);

    t.end();
});

test('ITP Sort', (t) => {
    t.test('ITP Sort: Basic', (q) => {
        let feats = [
            { id: 2, properties: { 'carmen:lfromhn': 22 } },
            { id: 4, properties: { 'carmen:lfromhn': 1423 } },
            { id: 1, properties: { 'carmen:lfromhn': 3 } },
            { id: 5, properties: { 'carmen:lfromhn': 4362 } },
            { id: 3, properties: { 'carmen:lfromhn': 43 } }
        ]

        feats.sort(interpolize.itpSort);

        q.equals(feats[0].id, 1);
        q.equals(feats[1].id, 2);
        q.equals(feats[2].id, 3);
        q.equals(feats[3].id, 4);
        q.equals(feats[4].id, 5);

        q.end();
    });

    t.test('ITP Sort: Nulls Last', (q) => {
        let feats = [
            { id: 1, properties: { 'carmen:lfromhn': 22 } },
            { id: 2, properties: { 'carmen:lfromhn': 1423 } },
            { id: 5, properties: { } },
            { id: 3, properties: { 'carmen:lfromhn': 4362 } },
            { id: 4, properties: { } }
        ]

        feats.sort(interpolize.itpSort);

        q.equals(feats[0].id, 1);
        q.equals(feats[1].id, 2);
        q.equals(feats[2].id, 3);
        q.equals(feats[3].id, 4);
        q.equals(feats[4].id, 5);

        q.end();
    });
});

test('LSB', (t) => {
    t.test('LSB forward', (q) => {
        let LSB = interpolize.lsb(
            [-79.37625288963318,38.83449282408381],
            [-79.37467575073241,38.83594698648804]
        )
        q.equal(LSB, 1);
        q.end();
    });

    t.test('LSB reverse', (q) => {
        let LSB = interpolize.lsb(
            [-79.37467575073241,38.83594698648804],
            [-79.37625288963318,38.83449282408381]
        )
        q.equal(LSB, 1);
        q.end();
    });
    t.end();
});

test('segments', (t) => {
    let seg = interpolize.segment(
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

test('Interpolize', (t) => {
    let segs = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [-77.21062123775481,39.17687343078357],
                    [-77.21064805984497,39.1773849237293]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [-77.21054881811142,39.1769482836422],
                    [-77.21056759357452,39.17731007133552],
                    [-77.2107258439064,39.176966996844406],
                    [-77.21077680587769,39.177320467506085]
                ]
            }
        },
        number:  ["8","10","9","11"]
    }];

    let res = interpolize('Battleridge Place', segs);

    delete res.id;

    t.deepEquals(res, {
        type: 'Feature',
        properties: {
            'carmen:text': 'Battleridge Place',
            'carmen:center':[-77.2106346487999,39.17712917725643],
            'carmen:rangetype':'tiger',
            'carmen:parityl':[ ['O'], null],
            'carmen:lfromhn':[ [1] , null],
            'carmen:ltohn':  [ [21], null],
            'carmen:parityr':[['E'], null],
            'carmen:rfromhn':[ [0], null],
            'carmen:rtohn':  [ [20] ,null],
            'carmen:addressnumber':[null,['8','9','10','11']]
        },
        'geometry':{
            'type':'GeometryCollection',
            'geometries':[{
                'type':'MultiLineString',
                'coordinates':[[[-77.21062123775481,39.17687343078357],[-77.21064805984497,39.1773849237293]]]
            },{
                'type':'MultiPoint',
                'coordinates':[[-77.21054881811142,39.1769482836422],[-77.2107258439064,39.176966996844406], [-77.21056759357452,39.17731007133552], [-77.21077680587769,39.177320467506085]]
            }]
        }
    }, 'has expected props');

    t.end();
});

test('Interpolize - Addr past line end', (t) => {
    let segs = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [-77.21062123775481,39.17687343078357],
                    [-77.21064805984497,39.1773849237293]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
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
        },
        number: ["8","10","9","11","13","12"]
    }];


    let res = interpolize('Battleridge Place', segs, { debug: true });

    delete res.id;

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itp-pastline.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itp-pastline.json'));
    t.end();
});

test('Interpolize - Addr past line end - opposite', (t) => {
    let segs  = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [-77.21062123775481,39.17687343078357],
                    [-77.21064805984497,39.1773849237293]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [-77.21054881811142,39.1769482836422],
                    [-77.21056759357452,39.17731007133552],
                    [-77.2107258439064,39.176966996844406],
                    [-77.21077680587769,39.177320467506085],
                    [-77.21078217029572, 39.17767393639073],
                    [ -77.21056491136551,39.17757413359157 ]
                ]
            }
        },
        number: ["8","10","9","11","13","12"]
    }];

    let res = interpolize('Battleridge Place', segs, { debug: true });

    delete res.id;

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itp-pastline-opp.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itp-pastline-opp.json'));
    t.end();
});

test('Interpolize - Addr past line end - bend', (t) => {
    let segs = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [ -77.21002042293549, 39.17696283835544 ],
                    [ -77.20934987068176, 39.17688382701869 ],
                    [ -77.20870077610016, 39.177050166571725 ]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [ -77.20983803272247, 39.17702937414912 ],
                    [ -77.20847547054291, 39.177740471511456 ],
                    [ -77.20990777015686, 39.17674659659119 ],
                    [ -77.20825552940369, 39.1777238377372 ]
                ]
            }
        },
        number: [ "2", "4", "1", "3"]
    }];

    let res = interpolize('Battleridge Place', segs, { debug: true });

    delete res.id;

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itp-pastline-bend.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itp-pastline-bend.json'));
    t.end();
});

test('Interpolize - Addr past line end - bend - reverse', (t) => {
    let segs = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [ -77.20870077610016, 39.177050166571725 ],
                    [ -77.20934987068176, 39.17688382701869 ],
                    [ -77.21002042293549, 39.17696283835544 ]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [ -77.20983803272247, 39.17702937414912 ],
                    [ -77.20847547054291, 39.177740471511456 ],
                    [ -77.20990777015686, 39.17674659659119 ],
                    [ -77.20825552940369, 39.1777238377372 ]
                ]
            }
        },
        number: [ "2", "4", "1", "3"]
    }];

    let res = interpolize('Battleridge Place', segs, { debug: true });

    delete res.id;

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/itp-pastline-bend-rev.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }
    t.deepEquals(res, require('./fixtures/itp-pastline-bend-rev.json'));
    t.end();
});

/*
 * . |--
 *   | .
 * . |
 *   | .
 * . |
 */
test('Interpolize - Hooked Road', (t) => {
    let segs = [{
        network: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "LineString",
                coordinates: [
                    [ -77.19249486923218, 39.090421398604306 ],
                    [ -77.19209790229797, 39.09155388949448 ],
                    [ -77.19150245189667, 39.091428983303274 ]
                ]
            }
        },
        address: {
            type: "Feature",
            properties: { },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [-77.19264507293701,39.090575451742545],
                    [-77.19256460666656,39.09079612186787],
                    [-77.19247877597809,39.09103344557164],
                    [-77.19239830970764,39.0912208058263],
                    [-77.19228029251099,39.091412329127714],
                    [-77.19221591949463,39.09162466957128],
                    [-77.19157218933105,39.090342290105255],
                    [-77.19144344329834,39.090587942522795],
                    [-77.19135761260986,39.09077946754287],
                    [-77.19130396842955,39.09100430059841],
                    [-77.19125032424927,39.09124995071007]
                ]
            }
        },
        number: [ "2", "4", "6", "8", "10", "12", "1", "3", "5", "7", "9" ]
    }];

    let res = interpolize('Tommy Bell Pl', segs, { debug: true });

    delete res.id;

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/left-hook.json', JSON.stringify(res, null, 4));
        t.fail('had to update fixture');
    }

    t.deepEquals(res, require('./fixtures/left-hook.json'));
    t.end();
});

