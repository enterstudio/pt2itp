/**
 * Generates a map of street => address
 */
module.exports = function(freq, street, addresses) {
    let streetName = street.text;
    let current;

    for (let address_it = 0; address_it < addresses.length; address_it++) {
        let feat = addresses[address_it];
        let addressName = feat.text.split(' ');
        let score = 0;

        for (let token_it = 0; token_it < streetName.length; token_it++) {
            //If token exists, add freq value as score - rare token match = higher score

            if (addressName.indexOf(streetName[token_it]) !== -1) {
                score += freq[streetName[token_it]];
            }
        }

        if (!current || current.score < score) {
            current = {
                score: score,
                feat: feat
            }
        }
    }

    if (current && current.feat) return current.feat;

    return false;
}
