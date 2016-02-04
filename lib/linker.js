var _ = require('lodash');

/**
 * Generates a map of streets => address
 */
module.exports = function(nameFreq, streets, addresses) {
    //Array in format [street, street, .. ] => where street is [ address, address, .. ] => where address is SCORE .
    //It should be noted the element id of each array corresponds to the original position in the streets/addresses arguments
    var links = [];

    for (var street_it = 0; street_it < streets.features.length; street_it++) {
        var streetName = streets.features[street_it].properties.street;
        links[street_it] = [];

        for (address_it = 0; address_it < addresses.features.length; address_it++) {
            var addressName = addresses.features[address_it].properties.street;
            var score = 0;

            for (token_it = 0; token_it < streetName.length; token_it++) {
                //If token exists, add freq value as score - rare token match = higher score
                if (addressName.indexOf(streetName[token_it]) !== -1) {
                    score += nameFreq[streetName[token_it]];
                }
            }
            links[street_it][address_it] = score;
        }
    }

    return getHighest(links, {});
}

function getHighest(links, link) {
    var highest = {
        street: null,
        addr: null,
        score: 0
    };
    for (var street_it = 0; street_it < links.length; street_it++) {
        if (link[street_it]) return;
        var cur = _.max(links[street_it]);
        //TODO break ties with geographic prox
        if (cur > highest.score) {
            highest = {
                street: street_it,
                addr: links[street_it].indexOf(cur),
                score: cur
            }
        }
    }

    link[highest.street] = highest.addr;

    return link;
}
