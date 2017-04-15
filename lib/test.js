module.exports = test;

const fs = require('fs');
const path = require('path');
const Carmen = require('@mapbox/carmen');
const queue = require('d3-queue').queue;
const readline = require('readline');
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

    if (!argv.addresses && !argv.query) {
        console.error('--addresses=<FILE.geojson> or --query="QUERY" argument required');
        process.exit(1);
    } else if (!argv.index) {
        console.error('--index=<INDEX.mbtiles> argument required');
        process.exit(1);
    } else if (!argv.config) {
        console.error('--config=<CONFIG.json> argument required');
        process.exit(1);
    } else if (argv['addresses'] && argv['query']) {
        console.error('--addresses & --query cannot be used together');
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
    let stats = {
        pass: 0,
        fail: 0,
        total: 0
    }

    if (!argv.addresses) return geocode(argv.query, stat);

    rl = readline.createInterface({
        input: fs.createReadStream(path.resolve(argv.addresses))
    });

    rl.on('line', (line) => {
        if (!line.length) return;

        line = JSON.parse(line);

        if (!line.properties.street || !line.properties.number) return;

        geocode(`${line.properties.number} ${line.properties.street}`);
    });

    rl.on('end', () => {
        return stat();
    });

    function stat() {
        console.error('--- RESULTS ---');
        console.error(`Pass: ${stats.pass}`);
        console.error(`Fail: ${stats.fail}`);
        console.error(`Tot:  ${stats.total}`);
    }

    function geocode(query, cb) {
        c.geocode(query, {}, (err, res) => {
            if (err) throw err;

            stats.total++;

            if (!res.features[0] || res.features[0].place_name.toLowerCase() !== query.toLowerCase()) {
                stats.fail++;
                console.log(query);
            } else {
                stats.pass++;
            }

            if (cb) return cb();
        });
    }
}
