const map = require('../lib/map/strip-unit').map;
const test = require('tape');

test('Strip-Unit', (t) => {
    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'Polygon'
        }
    }).toString(), 'Error: Feat must be a Point geom', 'Feat must be a Point geom');

    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have properties object', 'Feat must have properties object');

    t.equals(map({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have number property', 'Feat must have number property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have street property', 'Feat must have street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: '   '
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have non-empty street property', 'Feat must have non-empty street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have 2 element coordinates array', 'Feat must have 2 element coordinates array');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [1000, 1000]
        }
    }).toString(), 'Error: Feat exceeds +/-180deg coord bounds', 'Feat exceeds +/-180deg coord bounds');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1000]
        }
    }).toString(), 'Error: Feat exceeds +/-85deg coord bounds', 'Feat exceeds +/-85deg coord bounds');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 'xyz',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat is not a supported address/unit type', 'Feat is not a supported address/unit type');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: '423524268974602783406982734',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Number should not exceed 10 chars', 'Number should not exceed 10 chars');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: 124,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '124', street: 'Main St' },
        type: 'Feature'
    }, 'Working Numeric Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '124',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '124', street: 'Main St' },
        type: 'Feature'
    }, 'Working String Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123a',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123a', street: 'Main St' },
        type: 'Feature'
    }, 'Working 123a Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123 1/2',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123', street: 'Main St' },
        type: 'Feature'
    }, 'Stripped 123 1/2 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123-45',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123-45', street: 'Main St' },
        type: 'Feature'
    }, 'Working 123-45 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123n45',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123n45', street: 'Main St' },
        type: 'Feature'
    }, 'Working 123n45 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123 B',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123b', street: 'Main St' },
        type: 'Feature'
    }, 'Working 123 B => 123B Address');

    t.end();
});

