/**
 * Generates a map of streets => address
 */
module.exports = function(nameFreq, streets, addresses) {
   var link = {};

   for (var street_it = 0; street_it < streets.features.length; street_it++) {
        var streetName = streets.features[street_it].properties.street;
        var match = [0, null] //[SCORE, ADDRESS_IT] (Note: Max score = 100)
        for (address_it = 0; address_it < addresses.features.length; address_it++) {
            var addressName = addresses.features[address_it].properties.street;
            var maxScore = 0;
            var score = 0;

            for (token_it = 0; token_it < streetName.length; token_it++) {
                maxScore += nameFreq[streetName[token_it]];
                if (addressName.indexOf(streetName[token_it]) !== -1) {
                    score += nameFreq[streetName[token_it]];
                }
            }
            if (score > match[0]) {
                match = [score, address_it];
            }
        }
        if (match[0] > .50) {
            link[street_it] = match[1];
        }
    }

    return link;
}
