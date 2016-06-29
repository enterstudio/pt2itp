module.exports = main;
module.exports.perFeat = perFeat;

/**
 * tokenize - Acceps a query string and returns a tokenized array
 *
 * @param  {String} query  A string to tokenize
 * @param  {Object} argv   Command List args object - specifically looking for optional tokens
 * @return {Array}         A tokenized array
 */
function main(query, argv) {
    if (!argv) argv = {};

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

    if (argv.tokens) {
        for (var i = 0; i < tokens.length; i++) { 
            if (argv.tokens[tokens[i]]) {
                tokens[i] = argv.tokens[tokens[i]];
            }
        }
    }

    return tokens;
}

function perFeat(feats) {
    feats.features = feats.features.map(function(feat) {
        if (feat.properties.street) {
            feat.properties['carmen:text'] = feat.properties.street;
            feat.properties.street = main(feat.properties.street, global.mapOptions);
        } else {
            feat.properties.street = [];
        }
        return feat;
    });
    return feats;
}
