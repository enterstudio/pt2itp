module.exports = split;

var turf = require('@turf/turf');

function split(id, pool, cb) {
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
    `, function(err, res) {
        if (err) return cb(err);

        var feat = {
            text: res.rows[0].text,
            _text: res.rows[0]._text,
            network: JSON.parse(res.rows[0].network),
            address: JSON.parse(res.rows[0].address)
        }

        for (var pt_it = 0; pt_it < feat.address.coordinates.length; pt_it++) {
            var pt = turf.point(feat.address.coordinates[pt_it]);

            for (var ln_it = 0; ln_it < feat.network.coordinates.length; ln_it++) {
                var ln = turf.lineString(feat.network.coordinates[ln_it]);

                console.log(pt, ln)

            }
        }

        return cb();
    });
}
