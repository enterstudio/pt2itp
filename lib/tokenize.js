const tokens = require('@mapbox/geocoder-abbreviations')

module.exports = {};
module.exports.main = main;
module.exports.createGlobalReplacer = createGlobalReplacer;
module.exports.createReplacer = createReplacer;
module.exports.replaceToken = replaceToken;

const _ = require('lodash');

/**
 * main - Acceps a query string and returns a tokenized array
 *
 * @param  {String} query  A string to tokenize
 * @param  {Object} tokens Replacement tokens
 * @return {Array}         A tokenized array
 */

function main(query, replacer, complex) {
    if (!replacer) replacer = {};
    complex = !!complex;

    let normalized = query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        // collapse apostraphes, periods
        .replace(/[\u2018\u2019\u02BC\u02BB\uFF07'\.]/g, '')
        // all other ascii and unicode punctuation except '-' per
        // http://stackoverflow.com/questions/4328500 split terms
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#\$%&\(\)\*\+,\.\/:;<=>\?@\[\]\^_`\{\|\}~]/gi, ' ')
        .split(/[\s+]+/gi);

    let pretokens = [];

    for (let i=0;i<normalized.length;i++) {
        if (/(\d+)-(\d+)[a-z]?/.test(normalized[i])) {
            pretokens.push(normalized[i]);
        } else {
            let splitPhrase = normalized[i].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    let tokens = [];
    let tokenless = [];

    for (let i = 0; i < pretokens.length; i++) {
        if (pretokens[i].length) {
            tokens.push(pretokens[i]);
        }
    }

    for (let i = 0; i < tokens.length; i++) {
        if (replacer[tokens[i]])
            tokens[i] = replacer[tokens[i]];
        else
            tokenless.push(tokens[i]);
    }

    if (complex)
        return { tokens: tokens, tokenless: tokenless };
    else
        return tokens;
}

/**
 * replaceToken - Accepts a query string and returns a tokenized text
 *
 * @param  {Object} regexp  A regexp to tokenize given string
 * @param  {String} query   A string to tokenize
 * @return {String}         A tokenized String
 */

function replaceToken(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        if (tokens[i].named)
            abbr = XRegExp.replace(abbr, tokens[i].from, tokens[i].to);
        else
            abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }
    return abbr;
}

/**
 * createGlobalReplacer - Accepts regexs and returns an array of RegExp objects
 *
 * @param  {Object} tokens
 * @return {Array}  An array of RegExp Objects
 */

function createGlobalReplacer(tokens) {
    var replacers = [];
    for (var token in tokens) {
        var from = token;
        var to = tokens[token];
        var entry = {
            named: false,
            from: new RegExp(from, 'gi'),
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
}

function createReplacer(languages) {
    let parsed = [];
    languages.forEach((token) => {
	parsed = parsed.concat(tokens(token, true)); // pull singletons in, too -- ie tokens that are common but have no abbreviation
    });

    let parsedTokens = {};
    parsed.forEach((parse) => {
	parse.sort((a, b) => {
	    return a.length > b.length
	});

	// we intentionally mark the smallest token as a replacement for itself
	// this seems silly but it lets us exclude it from text_tokenless in cases where it's pre-abbreviated
	for (let pi = 0; pi < parse.length; pi++)
	    parsedTokens[parse[pi].toLowerCase()] = parse[0].toLowerCase();
    });
    return parsedTokens;
}
