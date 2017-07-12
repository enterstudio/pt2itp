const wordBoundary = new RegExp("[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]+", 'g');
const diacritics = require('diacritics').remove;

module.exports = (cc, favor) => {
    let minors;
    if (cc && (cc !== 'en'))
        throw new Error('only en titlecase minors are currently supported');
    else
        minors = require('title-case-minors');

    return (feature) => {
        let text, other;
        if (!favor || (favor === 'network')) {
            text = feature.network_text;
            other = feature.address_text;
        }
        else {
            text = feature.address_text;
            other = feature.network_text;
        }

        // shortcircuit if network & address text agree
        if (diacritics(text).toLowerCase().trim() === diacritics(other).toLowerCase().trim())
            return text;

        let separators = [];
        for(let separator = wordBoundary.exec(text); !!separator; separator = wordBoundary.exec(text))
            separators.push(separator[0][0]);
        return text
            .split(wordBoundary)
            .map((y) => { return y.toLowerCase(); })
            .reduce((prev, cur, i) => {
                if (i > 0)
                    prev.push(separators[i-1]);
                if (minors.indexOf(cur) !== -1)
                    prev.push(cur);
                else
                    prev.push(cur[0].toUpperCase() + cur.slice(1));
                return prev;
            }, [])
            .join('');
    };
};
