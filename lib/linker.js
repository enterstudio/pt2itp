/**
 * Generates a map of street => address
 */
module.exports = function(freq, street, addresses) {
    var streetName = street.text;
    var current;

    for (address_it = 0; address_it < addresses.length; address_it++) {
        var feat = addresses[address_it];
        var addressName = feat.text.split(' ');
        var score = 0;

        for (token_it = 0; token_it < streetName.length; token_it++) {
            //If token exists, add freq value as score - rare token match = higher score
            if (addressName.indexOf(streetName[token_it]) !== -1) {
                score += freq[streetName[token_it]];
            }
        }

        console.log(streetName, addressName, score)
    }
}
