const post = require('../lib/post/sort').post;
const test = require('tape');

test('Post: Sort', (t) => {
    t.equals(post(), undefined);
    t.deepEquals(post({}), {});
    t.deepEquals(post({
        properties: {}
    }), {
        properties: {}
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[10,9,8,7,6,5,4,3,2,1]]
        },
        geometry: {
            geometries: [{
                coordinates: [[10,10],[9,9],[8,8],[7,7],[6,6],[5,5],[4,4],[3,3],[2,2],[1,1]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [ [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ] ]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [null, [10,9,8,7,6,5,4,3,2,1]]
        },
        geometry: {
            geometries: [null, {
                coordinates: [[10,10],[9,9],[8,8],[7,7],[6,6],[5,5],[4,4],[3,3],[2,2],[1,1]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [ null, [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ] ]
        },
        geometry: {
            geometries: [null, {
                coordinates: [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10]]
            }]
        }
    });

    t.end();
});
