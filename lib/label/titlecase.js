/*eslint no-lonely-if: "off"*/ // <-- complying with this linting rule would reduce code readability

const wordBoundary = new RegExp("[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]+", 'g');
const diacritics = require('diacritics').remove;
const dist = require('fast-levenshtein').get

function isUpperCase(x) {
    return x.toUpperCase() === x;
}

function numCaseChanges(x) {
    return x
        .split('')
        .filter((y) => { return /\w/.test(y); })
        .reduce((prev, cur, i, arr) => {
            if (i === 0) return 0;
            if (isUpperCase(cur) !== isUpperCase(arr[i-1]))
                return prev + 1;
            else
                return prev;
        }, 0);
}

function titleCase(text, minors) {
    minors = minors || [];
    let separators = [];
    for (let separator = wordBoundary.exec(text); !!separator; separator = wordBoundary.exec(text))
        separators.push(separator[0][0]);
    return text
        .split(wordBoundary)
        .map((y) => { return y.toLowerCase(); })
        .reduce((prev, cur, i) => {
            if (i > 0)
                prev.push(separators[i-1]);
            if (cur.length > 0) {
                if (minors.indexOf(cur) !== -1)
                    prev.push(cur);
                else
                    prev.push(cur[0].toUpperCase() + cur.slice(1));
            }
            return prev;
        }, [])
        .join('');
}

module.exports = (opts) => {
    opts = opts || {};

    let minors;
    if (opts.language && (opts.language !== 'en'))
        throw new Error('only en titlecase minors are currently supported');
    else
        minors = require('title-case-minors');

    let synonym = !!opts.synonym;

    return (feature) => {
        let text, other;
        if (opts.favor && (opts.favor === 'network')) {
            text = feature.network_text;
            other = feature.address_text;
        }
        else {
            text = feature.address_text;
            other = feature.network_text;
        }

        if (text) text = text.trim();
        if (other) other = other.trim();

        if (!text) {
            text = other;
        }
        else {
            // shortcircuit if network & address text agree
            // return the one with more case changes, which presumably means more case information
            if (other && diacritics(text).toLowerCase().trim() === diacritics(other).toLowerCase().trim()) {
                if (numCaseChanges(text) >= numCaseChanges(other))
                    return text;
                else
                    return other;
            }
        }

        // otherwise, apply title case
        if (synonym && (diacritics(text) !== diacritics(other)))
            return titleCase(text, minors) + ',' + titleCase(other, minors);
        else
            return titleCase(text, minors);
    };
};

module.exports.titleCase = titleCase;
