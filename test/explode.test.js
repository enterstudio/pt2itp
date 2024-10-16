const test = require('tape');
// add test for feature that dedupe will collapse & should discard
const explode = require('../lib/explode');

test('explode', (t) => {
    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": [1,1]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates,  [ 1, 1 ] , 'Non linestrings are ignored');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[0,1]], [[0,1],[1,1]]]
            }
        }]
    }, { degTolerance: 100, noDistance: true }).features[0].geometry.coordinates,  [ [ 0, 0 ], [ 0, 1 ], [ 1, 1 ] ], '90 deg angle');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[0,1]], [[0,1],[1,1]]]
            }
        }]
    }, { degTolerance: 30, noDistance: true }).features[0].geometry.coordinates, [ [ 0, 0 ], [ 0, 1 ] ], '90 deg angle cutoff');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates,  [ [ 0, 0 ], [ 1, 1 ] ] , '-1->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[0,0],[1,1]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-1-> -2->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]], [[-1,-1],[0,0]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-2-> -1->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[1,1],[0,0]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '-1-> <-2-');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[1,1],[0,0]], [[-1,-1],[0,0]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[1,1],[0,0],[-1,-1 ]], '-2-> <-1-');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[2,2], [1,1]],[[0,0],[1,1]], [[3,3], [2,2]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1],[2,2],[3,3]], '-1-> -3-> <-2- <-4-');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[3,3], [2,2]], [[4,4], [3,3]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ] ], '<-1- <-2-');

    let res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[4,4],[3,3]], [[3,3],[2,2]]]
            }
        }]
    }, { noDistance: true });
    t.pass('<-2- <-1-');
    t.deepEquals(res.features[0].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ] ]);
    t.deepEquals(res.features.length, 1);

    res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[-1,-1],[0,0]],[[3,3], [2,2]],[[0,0],[1,1]], [[4,4], [3,3]]]
            }
        }]
    }, { noDistance: true });
    t.ok(true, '-1-> -3->   <-2- <-4-');
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -1, -1 ], [ 0, 0 ], [ 1, 1 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ 4, 4 ], [ 3, 3 ], [ 2, 2 ]]);
    t.deepEquals(res.features.length, 2);

    //Don't connect where divided highways meet or else you can get odds and evens on the same side
    res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [
                    [ [ -66.15374565124512, 45.24081084565751 ], [ -66.15177154541016, 45.23967766228492 ], [ -66.15009784698486, 45.23816671596496 ], [ -66.14908933639526, 45.236489518498345 ], [ -66.14827394485474, 45.23441939571161 ] ],
                    [ [ -66.15344524383545, 45.241203677284545 ], [ -66.15202903747559, 45.24032735684951 ], [ -66.15102052688599, 45.23963233447991 ], [ -66.14992618560791, 45.23855956587336 ], [ -66.14919662475586, 45.23730545858455 ], [ -66.1483383178711, 45.23499359791086 ], [ -66.14827394485474, 45.23441939571161 ] ]
                ]
            }
        }]
    });
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -66.15374565124512, 45.24081084565751 ], [ -66.15177154541016, 45.23967766228492 ], [ -66.15009784698486, 45.23816671596496 ], [ -66.14908933639526, 45.236489518498345 ], [ -66.14827394485474, 45.23441939571161 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ -66.15344524383545, 45.241203677284545 ], [ -66.15202903747559, 45.24032735684951 ], [ -66.15102052688599, 45.23963233447991 ], [ -66.14992618560791, 45.23855956587336 ], [ -66.14919662475586, 45.23730545858455 ], [ -66.1483383178711, 45.23499359791086 ], [ -66.14827394485474, 45.23441939571161 ] ]);
    t.deepEquals(res.features.length, 2);

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[1,1]],[[0,0],[-1,-1]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[-1,-1,], [0,0], [1,1]], '<-2- -1->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[[0,0],[-1,-1]],[[0,0],[1,1]]]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[1,1,], [0,0], [-1,-1]], '<-1- -2->');

    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [
                    [ [ -75.49416303634644, 39.78758228335605 ], [ -75.49162030220032, 39.78959385734031 ] ],
                    [ [ -75.49162030220032, 39.78959385734031 ], [ -75.49128770828247, 39.78975873784561 ] ]
                ]
            }
        }]
    }).features[0].geometry.coordinates, [ [ -75.49416303634644, 39.78758228335605 ], [ -75.49162030220032, 39.78959385734031 ], [ -75.49128770828247, 39.78975873784561 ] ], '-1-> -2-> (real world)');

    //Don't connect segements that will create a self intersecting geometry
    res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [
                    [ [ -75.49405574798584, 39.78426800449771 ], [ -75.49497842788695, 39.78532331459258 ], [ -75.49482822418213, 39.78603234197182 ], [ -75.49418449401855, 39.786972204212276 ], [ -75.49416303634644, 39.78758228335605 ], [ -75.49162030220032, 39.78959385734031 ] ],
                    [ [ -75.49162030220032, 39.78959385734031 ], [ -75.49128770828247, 39.78975873784561 ], [ -75.49092292785645, 39.78970927373552 ], [ -75.49080491065979, 39.78933829177609 ], [ -75.49094438552856, 39.78882715779947 ], [ -75.49254298210144, 39.787524573398436 ], [ -75.49360513687134, 39.78587569701685 ], [ -75.49556851387024, 39.78637860850151 ] ]
                ]
            }
        }]
    });
    t.deepEquals(res.features[0].geometry.coordinates, [ [ -75.49405574798584, 39.78426800449771 ], [ -75.49497842788695, 39.78532331459258 ], [ -75.49482822418213, 39.78603234197182 ], [ -75.49418449401855, 39.786972204212276 ], [ -75.49416303634644, 39.78758228335605 ], [ -75.49162030220032, 39.78959385734031 ] ]);
    t.deepEquals(res.features[1].geometry.coordinates, [ [ -75.49162030220032, 39.78959385734031 ], [ -75.49128770828247, 39.78975873784561 ], [ -75.49092292785645, 39.78970927373552 ], [ -75.49080491065979, 39.78933829177609 ], [ -75.49094438552856, 39.78882715779947 ], [ -75.49254298210144, 39.787524573398436 ], [ -75.49360513687134, 39.78587569701685 ], [ -75.49556851387024, 39.78637860850151 ] ]);
    t.deepEquals(res.features.length, 2);

    res = explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [[ [ 145.73925929144025, -16.99098384759543 ], [ 145.7392932381481, -16.991027535005088 ], [ 145.73934026062489, -16.991072585130624 ], [ 145.7394029572606, -16.991129979936815 ], [ 145.7394967507571, -16.991198997969562 ], [ 145.73987527750432, -16.99157799549465 ], [ 145.7400747667998, -16.991782724380528 ], [ 145.7402295805514, -16.991924848099742 ], [ 145.7402652874589, -16.99195202233497 ], [ 145.74029345065355, -16.991973585368385 ], [ 145.7403697259724, -16.992020639265405 ], [ 145.74047525413334, -16.992077392501983 ], [ 145.74071556329727, -16.992161319926282 ], [ 145.74086803011596, -16.99222248191286 ], [ 145.74092661961913, -16.992252622019492 ], [ 145.74097749777138, -16.992288052670546 ], [ 145.74102527461946, -16.992330777858527 ], [ 145.74106374755502, -16.992379354702052 ], [ 145.74108998291194, -16.99242809185256 ], [ 145.74111915193498, -16.9924935823786 ], [ 145.74113683775067, -16.992558351444288 ], [ 145.74115762487054, -16.992651977974916 ], [ 145.74116231873631, -16.9927130596418 ], [ 145.7411522604525, -16.992791936725496 ], [ 145.74113683775067, -16.99283538323506 ], [ 145.74112149886787, -16.992876665425783 ], [ 145.74108604341745, -16.992941434359125 ], [ 145.74097322300076, -16.99312043056473 ], [ 145.74096148833632, -16.993143837131612 ], [ 145.74091354385018, -16.993187844675788 ], [ 145.7408903259784, -16.99321574016294 ], [ 145.74085512198508, -16.993271531124762 ], [ 145.7408261206001, -16.99332179107185 ], [ 145.7407933473587, -16.993378463755207 ], [ 145.7406860589981, -16.99356387228694 ], [ 145.74067474342883, -16.99361252897029 ], [ 145.74065915308893, -16.993644352197833 ], [ 145.74061447754502, -16.993757056078735 ], [ 145.74060022830963, -16.993810522263104 ], [ 145.74058807455003, -16.99387272578076 ], [ 145.74058396741748, -16.993929157820162 ], [ 145.7406022399664, -16.994098293518334 ], [ 145.7406524475664, -16.994310875231562 ], [ 145.7406746596098, -16.994410192171074 ], [ 145.7406886573881, -16.99449283600879 ], [ 145.74069335125387, -16.994531873385995 ], [ 145.7406886573881, -16.994605539379577 ], [ 145.74067692272365, -16.99465243229841 ], [ 145.74066292494535, -16.994703894257356 ], [ 145.74064197018743, -16.994749664928605 ], [ 145.74060693383217, -16.994804333211306 ], [ 145.74057307094336, -16.994846737190883 ], [ 145.740540381521, -16.99487463243119 ], [ 145.74050534516573, -16.99490364988941 ], [ 145.7404761761427, -16.994921525282678 ], [ 145.74043066240847, -16.994943889561583 ], [ 145.74034893885255, -16.994971864946123 ], [ 145.74022287502885, -16.995000882389277 ], [ 145.73992154560983, -16.995066852968492 ], [ 145.73960638605058, -16.995131460827935 ], [ 145.73938594199717, -16.995174746478128 ], [ 145.73930765502155, -16.995174746478128 ], [ 145.73923858813941, -16.995166971093553 ], [ 145.73911864310503, -16.995147572709996 ], [ 145.73886358179152, -16.99509795452147 ], [ 145.73875688016415, -16.99507655216469 ], [ 145.73865319602191, -16.995042564896465 ], [ 145.73841934092343, -16.994951264161926 ], [ 145.73802438564599, -16.994794954636077 ], [ 145.73795087635517, -16.99474902365833 ], [ 145.73789899237454, -16.994706299021445 ], [ 145.73784006759524, -16.994638244185737 ], [ 145.73780972510576, -16.99458157188323 ], [ 145.7377841603011, -16.994510951917917 ], [ 145.7377638760954, -16.994437045410393 ], [ 145.73775876313448, -16.994391354821772 ], [ 145.7377638760954, -16.994336926895514 ], [ 145.73779539205134, -16.994195045481803 ], [ 145.73784819804132, -16.99402102016616 ], [ 145.73825505562127, -16.992586727983323 ], [ 145.73840274475515, -16.992087492652445 ], [ 145.73847172781825, -16.991842443610125 ], [ 145.73852067813277, -16.99173839586625 ], [ 145.7385521940887, -16.99167354635722 ], [ 145.73859066702425, -16.991617754919886 ], [ 145.73868756182492, -16.991507294237806 ], [ 145.73879149742424, -16.99141238457223 ]],[ [ 145.73879149742424, -16.99141238457223 ], [ 145.73906935751438, -16.99117334667116 ], [ 145.73914177715778, -16.991161242463505 ], [ 145.73918879963458, -16.991119959895087 ], [ 145.7392475567758, -16.991070019999214 ], [ 145.7392932381481, -16.991027535005088 ], [ 145.73933112435043, -16.990991382672334 ], [ 145.73937948793173, -16.990930140123737 ], [ 145.739427767694, -16.99085767509277 ], [ 145.73944478295743, -16.990812785236557 ], [ 145.7394520752132, -16.990771342270435 ], [ 145.73948308825493, -16.990714668799086 ], [ 145.7395184598863, -16.990619037287345 ] ]]
            }
        }]
    });
    t.deepEquals(res.features.length, 3);

    t.end();
});

test('explode#dedupeBorks', (t) => {
    t.deepEquals(explode({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [ 
                    [ [0,1], [1,0] ],
                    [ [1,1], [1,1] ]
                ]
            }
        }]
    }, { noDistance: true }).features[0].geometry.coordinates, [[0,1], [1,0]], 'single-point dedupes are discarded');
    t.end();
});

test('explode#hasIntersect', (t) => {
    t.equals(explode.hasIntersect(
        [[0,0], [1,1]],
        [[1,1], [2,2]]
    ), false, 'simple join');

    t.equals(explode.hasIntersect(
        [[0,0], [1,1], [0,1]],
        [[1,0], [0,1]]
    ), true, 'crossing');

    t.end();
});

test('explode#sortStreets', (t) => {
    t.test('explode#sortStreets - Basic - NonMultiFirst', (q) => {
        let strs = [
            { id: 1, "type": "Feature", "properties": {}, "geometry": { "type": "LineString", "coordinates": [ [ -46.7578125, 37.71859032558816 ], [ -31.289062500000004, 37.71859032558816 ] ] } },
            { id: 2, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -74.1796875, 22.268764039073968 ], [ 65.7421875, 24.5271348225978 ] ] ] } }
        ];

        strs.sort(explode.sortStreets);

        q.equals(strs[0].id, 1);
        q.equals(strs[1].id, 2);

        q.end();
    });

    t.test('explode#sortStreets - Basic - NonMultiFirst', (q) => {
        let strs = [
            { id: 1, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -74.1796875, 22.268764039073968 ], [ 65.7421875, 24.5271348225978 ] ] ] } },
            { id: 2, "type": "Feature", "properties": {}, "geometry": { "type": "LineString", "coordinates": [ [ -46.7578125, 37.71859032558816 ], [ -31.289062500000004, 37.71859032558816 ] ] } }
        ];

        strs.sort(explode.sortStreets);

        q.equals(strs[0].id, 2);
        q.equals(strs[1].id, 1);

        q.end();
    });

    t.test('explode#sortStreets - Basic', (q) => {
        let strs = [
            { id: 1, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -46.7578125, 37.71859032558816 ], [ -31.289062500000004, 37.71859032558816 ] ] ] } }, //Shorter Line
            { id: 2, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -74.1796875, 22.268764039073968 ], [ 65.7421875, 24.5271348225978 ] ] ] } } //Longer Line
        ];

        strs.sort(explode.sortStreets);

        q.equals(strs[0].id, 2);
        q.equals(strs[1].id, 1);

        q.end();
    });

    t.test('explode#sortStreets - Basic - allready sorted', (q) => {
        let strs = [
            { id: 1, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -74.1796875, 22.268764039073968 ], [ 65.7421875, 24.5271348225978 ] ] ] } }, //Longer Line
            { id: 2, "type": "Feature", "properties": {}, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ -46.7578125, 37.71859032558816 ], [ -31.289062500000004, 37.71859032558816 ] ] ] } } //Shorter Line
        ];

        strs.sort(explode.sortStreets);

        q.equals(strs[0].id, 1);
        q.equals(strs[1].id, 2);

        q.end();
    });

    t.end();
});
