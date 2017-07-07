const tape = require('tape');
const titlecase = require('../lib/titlecase');

tape('title case xformation', (t) => {
    let tests = [
        ['Väike-Sõjamäe', 'Väike-Sõjamäe'],
        ['Väike-sõjamäe', 'Väike-Sõjamäe'],
        ['väike-sõjamäe', 'Väike-Sõjamäe'],
        ['väike sõjamäe', 'Väike Sõjamäe'],
        ['väike  sõjamäe', 'Väike Sõjamäe'],
        ['Väike Sõjamäe', 'Väike Sõjamäe'],
        ['VäikeSõjamäe', 'Väikesõjamäe'],
        ['abra CAda -bra', 'Abra Cada Bra'],
        ['our lady of whatever', 'Our Lady of Whatever'],
        ['our lady OF whatever', 'Our Lady of Whatever']
    ];

    for (let test of tests)
        t.equal(titlecase(test[0]), test[1], `${test[0]} => ${test[1]}`);

    t.end();
});