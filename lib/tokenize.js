module.exports = main;
module.exports.perFeat = perFeat;

var _ = require('lodash');

/**
 * tokenize - Acceps a query string and returns a tokenized array
 *
 * @param  {String} query  A string to tokenize
 * @param  {Object} tokens Replacement tokens
 * @return {Array}         A tokenized array
 */
function main(query, tokens) {
    if (!tokens) tokens = {};

    var normalized = query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        // collapse apostraphes, periods
        .replace(/['\.]/g, '')
        // all other ascii and unicode punctuation except '-' per
        // http://stackoverflow.com/questions/4328500 split terms
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#\$%&\(\)\*\+,\.\/:;<=>\?@\[\]\^_`\{\|\}~]/gi, ' ')
        .split(/[\s+]+/gi);

    var pretokens = [];

    for (var i=0;i<normalized.length;i++) {
        if (/(\d+)-(\d+)[a-z]?/.test(normalized[i])) {
            pretokens.push(normalized[i]);
        } else {
            var splitPhrase = normalized[i].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    var tokens = [];

    for (var i = 0; i < pretokens.length; i++) {
        if (pretokens[i].length) {
            tokens.push(pretokens[i]);
        }
    }

    if (tokens) {
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[tokens[i]]) {
                tokens[i] = tokens[tokens[i]];
            }
        }
    }

    return tokens;
}

/**
 * perFeat - Acceps a feature collections and returns a feature collection of tokens
 *           Also creates duplicate streets for alternate names
 *
 * @param  {FeatureCollection} feats  A FeatureCollection to tokenize
 * @return {FeatureCollection}        A tokenized FeatureCollection
 */
function perFeat(feats) {
    var processedFeats = {
        type: 'FeatureCollection',
        features: []
    };

    for (var feat_it = 0; feat_it < feats.features.length; feat_it++) {
        var feat = feats.features[feat_it];

        if (feat.properties.number && !String(feat.properties.number).match(/^[0-9]+$/)) {
            throw new Error(feat.properties.number + ' must be a valid integer address');
        }

        if (Array.isArray(feat.properties.street)) {
            feat.properties.street = _.uniqBy(feat.properties.street, function(e) {
                return e.toLowerCase();
            });

            feat.properties.street.forEach(function(streetAlt, it) {
                var workingStreet = _.clone(feat.properties.street);
                workingStreet.splice(it, 1);

                var newfeat = {
                    type: 'Feature',
                    properties: {
                        'carmen:text': streetAlt,
                        street: main(streetAlt, global.mapOptions),
                        alternates: workingStreet
                    },
                    geometry: _.clone(feat.geometry)
                }
                processedFeats.features.push(newfeat)
            });
        } else if (feat.properties.street) {
            feat.properties['carmen:text'] = feat.properties.street;
            feat.properties.street = main(feat.properties.street, global.mapOptions);
            feat.properties.alternates = [];
            processedFeats.features.push(feat)
        } else {
            feat.properties.street = [];
            feat.properties.alternates = [];
            processedFeats.features.push(feat)
        }
    }
    return processedFeats;
}
