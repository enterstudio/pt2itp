const tokenize = require('./tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');
const diacritics = require('diacritics').remove;
const title = require('to-title-case');
const readline = require('readline');
const turf = require('@turf/turf');
const fs = require('fs');

let opts = {};
const unitMap = {};

let unit_it = 0;
let reverseMap = new Map();
let tokenRegex = tokenize.createGlobalReplacer(tokens().global);

process.on('message', (message) => {
    init(message);

    process.title = `COPY - ${opts.type} - ${opts.id}`;

    return start();
});

function start(callback) {
    rl = readline.createInterface({
        input: opts.read,
        output: opts.output
    });

    let num = 0;

    rl.on('close', () => {
        if (!opts.solo) {
	    opts.output.end(() => {
		process.send(unitMap);
	    });
	}
	if (callback && (typeof callback === 'function'))
	    return callback();
    });

    rl.on('line', (data) => {
        if (!data || !data.length) return;

        num++;

        if (num % opts.total !== opts.id) return; //Distribute tasks evenly accross workers

        let feat = false;

        try {
            feat = JSON.parse(data);

            if (opts.map) feat = opts.map(feat);
        } catch (err) {
            if (opts.error) process.stderr.write(`Unable to parse: ${err.toString()}\t${data}\n`);
        }

        if (!feat || typeof feat !== 'object' || feat instanceof Error) {
            //map errors that matter are Error objects, features that are thrown away for valid reasons are simply false
            //Only log actual errors to disk
            if (feat instanceof Error) {
                if (opts.error) process.stderr.write(`Rejected by map module: ${feat.toString()}\t${data}\n`);
            }
            return;
        }

        feat = turf.truncate(feat, 6, 2, true);

        //Streets will attempt to be named if they are missing later on
        if (opts.type === 'address' && !feat.properties.street) {
            if (opts.error) process.stderr.write(`Missing street name\t${data}\n`);
            return;
        }

        if (Array.isArray(feat.properties.street)) feat.properties._text = feat.properties.street.join(',');
        else feat.properties._text = feat.properties.street;

        if (feat.properties.street.length > 0) {
            //@TODO HACK - need to support alt names eventually
            if (Array.isArray(feat.properties.street)) feat.properties.street = feat.properties.street[0];

        } else {
            feat.properties.street = '';
        }

        feat.properties._text = title(feat.properties.street);                              //The _text value is what is displayed to the user - it should not be modified after this

        let tokens = tokenize.main(feat.properties.street, opts.tokens, true);
        feat.properties.street = diacritics(tokens.tokens.join(' '));                       //The street is standardized and it what is used to compare to the address cluster
        feat.properties.street = tokenize.replaceToken(tokenRegex, feat.properties.street);
        feat.properties.streetTokenless = diacritics(tokens.tokenless.join(' '));           //we will also use the tokenless form during the linker phase

        if (opts.type === 'address') {
            if (feat.properties.number === null) {
                if (opts.error) process.stderr.write(`.number cannot be null\t${data}\n`);
                return;
            }

            if (isNaN(Number(feat.properties.number))) {
                let unit = feat.properties.number.replace(/^\d+/, '');
                let num = feat.properties.number.match(/^\d+/)[0];

                if (reverseMap.has(unit)) {
                    num = `${num}.${reverseMap.get(unit)}`;
                } else {
                    let alias = parseInt(`${opts.id+1}${++unit_it}`)
                    unitMap[alias] = unit;
                    reverseMap.set(unit, alias);
                    num = `${num}.${alias}`;
                }

                feat.properties.number = num;
            }

            return rl.output.write(`${str(feat.properties.street)}|${str(feat.properties.streetTokenless)}|${str(feat.properties._text)}|${JSON.stringify(str(feat.geometry.coordinates[0]))}|${JSON.stringify(str(feat.geometry.coordinates[1]))}|${str(feat.properties.number)}\n`);
        } else {
            return rl.output.write(`${str(feat.properties.street)}|${str(feat.properties.streetTokenless)}|${str(feat.properties._text)}|${str(JSON.stringify(feat.geometry))}\n`);
        }
    });
}

function init(o) {
    opts = o;
    opts.map = opts.map ? require(opts.map).map : false;

    opts.read = fs.createReadStream(opts.read);
    if (typeof opts.output === 'string')
	opts.output = fs.createWriteStream(opts.output);
    else
	opts.output = process.stdout;
}

function str(s) {
    if (typeof s === 'string') return s.replace(/\|/g, '');
    return s;
}

module.exports.init = init;
module.exports.str = str;
module.exports.start = start;
