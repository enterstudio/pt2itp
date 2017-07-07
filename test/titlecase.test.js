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
        ['VäikeSõjamäe', 'VäikeSõjamäe']
    ];

    for (let test of tests)
        t.equal(titlecase(test[0]), test[1], `${test[0]} => ${test[1]}`);

    t.end();
});