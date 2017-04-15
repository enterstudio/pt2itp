module.exports = split;

const interpolize = require('./interpolize');

const turf = require('@turf/turf');

function split(argv, id, pool, output, cb) {
    pool.query(`
        SELECT
            network_cluster.text                AS text,
            network_cluster._text               AS _text,
            ST_AsGeoJSON(network_cluster.geom)  AS network,
            ST_AsGeoJSON(address_cluster.geom)  AS address
        FROM
            network_cluster,
            address_cluster
        WHERE
            network_cluster.id = ${id} AND
            network_cluster.address = address_cluster.id
    `, (err, res) => {
        if (err) return cb(err);

        res = res.rows[0];

        res.number = [];

        res.address = JSON.parse(res.address);
        res.address.coordinates.map((addr) => {
            res.number.push(addr[2])
            delete addr[2];
            return addr;
        });

        let feat = {
            text: res.text,
            _text: res._text,
            number: res.number,
            network: JSON.parse(res.network),
            address: res.address
        }

        let cluster = [];
        let addressCluster = [];

        for (let pt_it = 0; pt_it < feat.address.coordinates.length; pt_it++) {
            let pt = turf.point(feat.address.coordinates[pt_it]);

            let currentMatch = {
                dist: Infinity,
                ln: false
            };

            for (let ln_it = 0; ln_it < feat.network.coordinates.length; ln_it++) {
                let ln = turf.lineString(feat.network.coordinates[ln_it]);

                let dist = turf.distance(turf.pointOnLine(ln, pt), pt);

                if (dist < currentMatch.dist) {
                    currentMatch = { dist: dist, ln: ln_it, num: feat.number[pt_it] };
                }
            }

            if (!cluster[currentMatch.ln]) cluster[currentMatch.ln] = [];
            if (!addressCluster[currentMatch.ln]) addressCluster[currentMatch.ln] = [];
            cluster[currentMatch.ln].push(pt.geometry.coordinates);
            addressCluster[currentMatch.ln].push(feat.number[pt_it]);
        }

        for (let pt_it = 0; pt_it < cluster.length; pt_it++) {
            if (!cluster[pt_it]) {
                let out = {
                    type: 'Feature',
                    properties: {
                        'carmen:text': feat._text
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: feat.network.coordinates[pt_it]
                    }
                }

                if (argv.country) out.properties['carmen:geocoder_stack'] = argv.country;

                output.write(JSON.stringify(out) + '\n');
                continue;
            }

            let address = turf.multiPoint(cluster[pt_it], {
                numbers: addressCluster[pt_it],
                text: feat.text,
                'carmen:text': feat._text
            });
            let street = turf.lineString(feat.network.coordinates[pt_it], {
                text: feat.text,
                'carmen:text': feat._text
            });

            result = interpolize(street, address, { zoom: 14 });

            if (argv.country) result.properties['carmen:geocoder_stack'] = argv.country;

            if (result) output.write(JSON.stringify(result) + '\n');
        }

        return cb();
    });
}
