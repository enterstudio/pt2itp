module.exports = test;

const fs = require('fs');
const path = require('path');
const Carmen = require('@mapbox/carmen');
const queue = require('d3-queue').queue;
const MBTiles = require('mbtiles');

const index = require('../node_modules/@mapbox/carmen/lib/index.js');
const mem = require('../node_modules/@mapbox/carmen/lib/api-mem.js');
const addFeature = require('../node_modules/@mapbox/carmen/lib/util/addfeature.js');

//Use raw addresses to query generated ITP output to check for completeness
function test(argv) {
    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'addresses',
                'index',
                'query',
                'config'
            ]
        });
    }

    if (!argv.index) {
        console.error('--index=<INDEX.mbtiles> argument required');
        process.exit(1);
    } else if (!argv.config) {
        console.error('--config=<CONFIG.json> argument required');
        process.exit(1);
    } else if (!argv.query) {
        console.error('--query <Query> is required');
        process.exit(1);
    }

    let cnf = require(path.resolve(argv.config));
    if (cnf.metadata) cnf = cnf.metadata; //Necessary for internal use

    delete cnf.tiles;
    delete cnf.geocdoer_data;
    delete cnf.geocoder_format;

    let opts = {
        address: new MBTiles(path.resolve(argv.index), () => {})
    };

    opts.address.getInfo = (cb) => {
        return cb(null, cnf);
    }

    let c = new Carmen(opts);
    return geocode(argv.query);

    function geocode(query) {
        c.geocode(query, {}, (err, res) => {
            if (err) throw err;

            if (!res.features[0] || res.features[0].place_name.toLowerCase() !== query.toLowerCase()) {
                console.log(`ok - ${query}`);
            } else {
                console.log(`ok - ${query}`);
            }
        });
    }
}
