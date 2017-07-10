const post = require('../lib/post/cardinality').post;
const test = require('tape');

test('Post: Cardinality', (t) => {
    t.equals(post(), undefined);
    t.deepEquals(post({}), {});
    t.deepEquals(post({
        properties: {}
    }), {
        properties: {}
    });


    t.equals(f('Test'), 'Test');
    t.equals(f('Main St'), 'Main St');
    t.equals(f('S Main St'), 'S Main St,Main St S');
    t.equals(f('South Main St'), 'South Main St,Main St South');
    t.equals(f('Main St South'), 'Main St South,South Main St');
        //
    //At the moment we don't try to see if the synonyms are the same just that if there is a prefix/postfix existing already to skip
    t.equals(f('South Main St,Fake St South'), 'South Main St,Fake St South');

    //Random Sample From SG File
    t.equals(f('TUAS SOUTH BOULEVARD'), 'TUAS SOUTH BOULEVARD'); //We don't handle this format atm
    t.equals(f('JURONG WEST AVENUE'), 'JURONG WEST AVENUE');

    t.equals(f('ADMIRALTY ROAD EAST'), 'ADMIRALTY ROAD EAST,EAST ADMIRALTY ROAD');
    t.equals(f('ADMIRALTY ROAD WEST'), 'ADMIRALTY ROAD WEST,WEST ADMIRALTY ROAD');
    t.equals(f('EAST COAST PARKWAY'), 'EAST COAST PARKWAY,COAST PARKWAY EAST');
    t.equals(f('CORONATION ROAD WEST'), 'CORONATION ROAD WEST,WEST CORONATION ROAD');
    t.equals(f('BEDOK INDUSTRIAL PARK E'), 'BEDOK INDUSTRIAL PARK E,E BEDOK INDUSTRIAL PARK');
    t.equals(f('WEST COAST WALK'), 'WEST COAST WALK,COAST WALK WEST');
    t.equals(f('TANJONG KATONG ROAD SOUTH'), 'TANJONG KATONG ROAD SOUTH,SOUTH TANJONG KATONG ROAD');
    t.equals(f('WEST COAST VIEW'), 'WEST COAST VIEW,COAST VIEW WEST');

    t.end();
});

function f(text) {
    return post({
        type: 'Feature',
        properties: {
            'carmen:text': text
        }
    }).properties['carmen:text'];
}
