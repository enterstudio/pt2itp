const dist = require('fast-levenshtein').get;
const diacritics = require('diacritics').remove

/**
 * Generates a map of street => address
 */
module.exports = (street, addresses) => {
    let current;

    for (let addr_it = 0; addr_it < addresses.length; addr_it++) {
        let address = addresses[addr_it];

        //Short Circuit if the text is exactly the same

        if (address.text === street.text) return address;

        // use a weighted average w/ the tokenless dist score if possible
        let levScore;
        if (street.text_tokenless && address.text_tokenless) {
            levScore = (0.25 * dist(street.text, address.text)) + (0.75 *  dist(street.text_tokenless, address.text_tokenless));
        } else {
            // text_tokenless is unavailable for one or more of the features, but text is nonempty (it is not an unnamed road).
            // this can be due to an edge case like 'Avenue Street' in which all words are tokens.
            // in this case, short-circuit if one string is fully contained within another.
            if (address._text && street._text) {
                let shorter, longer;
                if (street._text.length > address._text.length) {
                    longer = diacritics(street._text).toLowerCase();
                    shorter = diacritics(address._text).toLowerCase();
                }
                else {
                    shorter = diacritics(street._text).toLowerCase();
                    longer = diacritics(address._text).toLowerCase();
                }
                if (longer.indexOf(shorter) !== -1)
                    return address;
                }


            if (!street.text || !street.text.length || !address.text || !address.text.length) continue;
            levScore = dist(street.text, address.text);
        }

        //Calculate % Match
        let score = 100 - (((2 * levScore) / (address.text.length + street.text.length)) * 100)

        if (!current || current.score < score) {
            current = {
                score: score,
                address: address
            }
        }
    }

    //There is a potential address match and it has a lev. distance of over 40% the same
    if (current && current.address && current.score > 40)  return current.address;
    return false;
}
