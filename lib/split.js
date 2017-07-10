const Post = require('./post');

const interpolize = require('./interpolize');
const explode = require('./explode');
const diacritics = require('diacritics').remove;
const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const pg = require('pg');

const misc = require('./misc');

let opts, pool, id;

process.on('message', (message) => {
    if (Array.isArray(message)) {
        const splitQ = Queue();

        for (let nid of message) {
            if (!nid) continue;
            splitQ.defer(split, nid);
        }

        splitQ.await((err) => {
            process.send({
                id: id,
                error: err,
                jobs: message.length
            });
        });
    } else {
        init(message);
        id = message.id;

        process.send({
            id: id,
            jobs: 0
        });
    }
});

//Only called by tests - child process kills this automatically
function kill() {
    pool.end();
}

function init(o) {
    opts = o;

    if (opts.post) opts.post = new Post(opts.post);

    pool = new pg.Pool(opts.pool);
}

function split(nid, cb) {
    pool.query(`
        SELECT
            network_cluster.text                AS ntext,
            network_cluster._text               AS n_text,
            address_cluster._text               AS a_text,
            ST_AsGeoJSON(network_cluster.geom)  AS network,
            ST_AsGeoJSON(address_cluster.geom)  AS address
        FROM
            network_cluster,
            address_cluster
        WHERE
            network_cluster.id = ${nid} AND
            network_cluster.address = address_cluster.id
    `, (err, res) => {
        if (err) return cb(err);

        res = res.rows[0];

        let network = JSON.parse(res.network);
        let address = JSON.parse(res.address);
        let number = [];
        let coords = [];

        let text = res.a_text;
        if (diacritics(text) !== diacritics(res.n_text)) text = text + ',' + res.n_text;

        //Convert 3 element coords to lat/lng + number array
        address.coordinates.forEach((addr) => {
            if (addr[2] % 1 != 0 && opts.unitMap) {
                let unit = parseInt(String(addr[2]).split('.')[1]);
                let num = String(addr[2]).split('.')[0];

                addr[2] = `${num}${opts.unitMap[unit]}`;
            }

            let num = addr.pop();

            //Remove duplicates within a cluster
            if (number.indexOf(num) === -1) {
                number.push(num);
                coords.push(addr);
            }
        });

        network = explode({
            type: 'FeatureCollection',
            features: [ turf.feature(network) ]
        });

        let addressCluster = [];
        let numberCluster = [];

        for (let it = 0; it < coords.length; it++) {
            let pt = turf.point(coords[it]);

            let currentMatch = {
                dist: Infinity,
                ln: false
            };

            for (let ln_it = 0; ln_it < network.features.length; ln_it++) {
                let ln = network.features[ln_it].geometry;

                let dist = turf.distance(turf.pointOnLine(ln, pt), pt);

                if (dist < currentMatch.dist) {
                    currentMatch = { dist: dist, ln: ln_it, num: number[it] };
                }
            }

            if (!addressCluster[currentMatch.ln]) addressCluster[currentMatch.ln] = [];
            if (!numberCluster[currentMatch.ln]) numberCluster[currentMatch.ln] = [];
            addressCluster[currentMatch.ln].push(pt.geometry.coordinates);
            numberCluster[currentMatch.ln].push(number[it]);
        }

        let segs = [];

        for (let it = 0; it < addressCluster.length; it++) {
            segs.push({
                address: addressCluster[it] ? turf.multiPoint(addressCluster[it]) : null,
                number: numberCluster[it] ? numberCluster[it] : null,
                network: turf.feature(network.features[it].geometry)
            });
        }

        let potential = interpolize(text, segs, {
            debug: opts.debug,
            post: opts.post,
            country: opts.country
        });

        process.stdout.write(JSON.stringify(potential) + '\n', cb);
    });
}

module.exports.split = split;
module.exports.init = init;
module.exports.kill = kill;

