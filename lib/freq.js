module.exports = function(streets, addresses) {
    nameFreq = {
        '_min': 1,
        '_max': 1
    };

    freq(streets);
    freq(addresses);

    //Maps each token count to ( ${Max Tokens} / ${Token Count} )
    var freq_keys = Object.keys(nameFreq);
    for (var freq_it = 0; freq_it < freq_keys.length; freq_it++) {
        nameFreq[freq_keys[freq_it]] = nameFreq._max / nameFreq[freq_keys[freq_it]];
    }

    return nameFreq;

    //Calculates the number of instances of a given token
    function freq(feats) {
        for (var feat_it = 0; feat_it < feats.features.length; feat_it++) {
            for (var token_it = 0; token_it < feats.features[feat_it].properties.street.length; token_it++) {
                var token = feats.features[feat_it].properties.street[token_it];
                if (nameFreq[token]) {
                    nameFreq[token]++;
                    if (nameFreq[token] > nameFreq._max) {
                        nameFreq._max++;
                    }
                } else {
                    nameFreq[token] = 1;
                }
            }
        }
    }
}
