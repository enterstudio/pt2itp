const post = require('../lib/post/cardinality').post;
const test = require('tape');

test('Post: Cardinality', (t) => {
    t.equals(post({
        type: 'Feature',
        properties: {
            'carmen:text': 'Test'
        }
    }).properties['carmen:text'], 'Test');

    t.equals(post({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main St'
        }
    }).properties['carmen:text'], 'Main St');

    t.equals(post({
        type: 'Feature',
        properties: {
            'carmen:text': 'S Main St'
        }
    }).properties['carmen:text'], 'S Main St,Main St S');

    t.equals(post({
        type: 'Feature',
        properties: {
            'carmen:text': 'South Main St'
        }
    }).properties['carmen:text'], 'South Main St,Main St South');

    //At the moment we don't try to see if the synonyms are the same just that if there is a prefix/postfix existing already to skip
    t.equals(post({
        type: 'Feature',
        properties: {
            'carmen:text': 'South Main St,Fake St South'
        }
    }).properties['carmen:text'], 'South Main St,Fake St South');

    t.end();
});

