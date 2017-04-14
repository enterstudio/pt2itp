module.exports = split;

const interpolize = require('./interpolize');

const turf = require('@turf/turf');

function split(id, pool, output, cb) {
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

        var feat = {
            text: res.text,
            _text: res._text,
            number: res.number,
            network: JSON.parse(res.network),
            address: res.address
        }

        var cluster = [];
        var addressCluster = [];

        for (var pt_it = 0; pt_it < feat.address.coordinates.length; pt_it++) {
            var pt = turf.point(feat.address.coordinates[pt_it]);

            var currentMatch = {
                dist: Infinity,
                ln: false
            };

            for (var ln_it = 0; ln_it < feat.network.coordinates.length; ln_it++) {
                var ln = turf.lineString(feat.network.coordinates[ln_it]);

                var dist = turf.distance(turf.pointOnLine(ln, pt), pt);

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
                output.write(JSON.stringify({
                    type: 'Feature',
                    properties: {
                        'carmen:text': feat._text
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: feat.network.coordinates[pt_it]
                    }
                }) + '\n');
                continue;
            }

            var address = turf.multiPoint(cluster[pt_it], {
                numbers: addressCluster[pt_it],
                text: feat.text,
                'carmen:text': feat._text
            });
            var street = turf.lineString(feat.network.coordinates[pt_it], {
                text: feat.text,
                'carmen:text': feat._text
            });

            result = interpolize(street, address, { zoom: 14 });

            if (result) output.write(JSON.stringify(result) + '\n');
        }

        return cb();
    });
}
