const tape = require('tape');
const titlecase = require('../lib/label/titlecase').titleCase;
const minors = require('title-case-minors');

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
        t.equal(titlecase(test[0], minors), test[1], `${test[0]} => ${test[1]}`);

    t.end();
});

tape('label logic, default behavior', (t) => {
    const label = require('../lib/label/titlecase')({ language: 'en' });
    let tests = [
        [{ address_text: 'our lady of whatever', network_text: 'our lady' }, 'Our Lady of Whatever'],
        [{ address_text: 'our lady of whatever', network_text: 'OUR LADY of WHATEVER' }, 'OUR LADY of WHATEVER'],
        [{ address_text: 'Our Lady of whatever', network_text: 'OUR LÄDY OF WHATEVER' }, 'Our Lady of whatever']
    ];

    for (let test of tests)
        t.equal(label(test[0], true), test[1], `${test[0].address_text}/${test[0].network_text} => ${test[1]}`);

    t.end();
});

tape('label logic, favor network', (t) => {
    const label = require('../lib/label/titlecase')({ language: 'en', favor: 'network' });
    let tests = [
        [{ address_text: 'our lady of whatever', network_text: 'our lady ' }, 'Our Lady']
    ];

    for (let test of tests)
        t.equal(label(test[0], true), test[1], `${test[0].address_text}/${test[0].network_text} => ${test[1]}`);

    t.end();
});

tape('label logic, include synonyms', (t) => {
    const label = require('../lib/label/titlecase')({ language: 'en', synonym: true});
    let tests = [
        [{ address_text: 'our lady of whatever', network_text: 'our lady ' }, 'Our Lady of Whatever,Our Lady']
    ];

    for (let test of tests)
        t.equal(label(test[0], true), test[1], `${test[0].address_text}/${test[0].network_text} => ${test[1]}`);

    t.end();
});
