const dist = require('fast-levenshtein').get;

/**
 * Generates a map of street => address
 */
module.exports = (street, addresses) => {
    let current;

    for (let address of addresses) {
        let addressName = address.text.split(' ');

        //Short Circuit if the text is exactly the same
        if (address.text === street.text) return address;

        let levScore = dist(street.text, address.text);

        //Calculate % Match
        let score = 100 - (((2 * levScore) / (address.text.length + street.text.length)) * 100)

        if (!current || current.score < score) {
            current = {
                score: score,
                feat: address
            }
        }
    }

    //There is a potential address match and it has a lev. distance of over 40% the same
    if (current && current.address && current.score > 0.40)  return current.address;
    return false;
}
