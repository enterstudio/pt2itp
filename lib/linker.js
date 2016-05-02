/**
 * Generates a map of streets => address
 */
module.exports = function(nameFreq, streets, addresses) {
    //Array in format [street, street, .. ] => where street is [ address, address, .. ] => where address is SCORE .
    //It should be noted the element id of each array corresponds to the original position in the streets/addresses arguments
    var links = [];

    var dups = {
        forward: [], // street_it = addr_it
        reverse: {} //street_name = [addr_it, ...]
    }; //Street names that are identical

    for (var street_it = 0; street_it < streets.features.length; street_it++) {
        var streetName = streets.features[street_it].properties.street;

        if (dups.reverse[streetName]) {
            dups.reverse[streetName].push(street_it);
            dups.forward[street_it] = streetName.join(',');
        } else { 
            dups.reverse[streetName] = [street_it];
            dups.forward[street_it] = streetName.join(',');
        }

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

    return {
        link: getHighest(links, {}, {}),
        dups: dups
    }
}

//links = score array
//link { street: addr } - store match
function getHighest(links, link) {
    var highest = {
        street: null,
        addr: null,
        score: 0
    };

    var addrs = Object.keys(link).map(function(key) {
        return link[key];
    });

    for (var street_it = 0; street_it < links.length; street_it++) {
        if (link[street_it]) continue;

        for (var addr_it = 0; addr_it < links[street_it].length; addr_it++) {
            if (addrs.indexOf(addr_it) !== -1) continue;

            if (links[street_it][addr_it] > highest.score) {
                highest = {
                    street: street_it,
                    addr: addr_it,
                    score: links[street_it][addr_it]
                }
            }
        }
    }
    if (highest.score > 0) {
        if (addrs.indexOf(highest.addr) === -1) {
            link[highest.street] = highest.addr;
        }
        links[highest.street][highest.addr] = null;
        return getHighest(links, link)
    } else {
        return link;
    }
}
