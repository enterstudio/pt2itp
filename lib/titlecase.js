const minors = require('title-case-minors');
const wordBoundary = new RegExp("[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]+", 'g');

function titleCase(x) {
    let separators = [];
    for(let separator = wordBoundary.exec(x); !!separator; separator = wordBoundary.exec(x))
        separators.push(separator[0][0]);
    return x
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
}

module.exports = titleCase;