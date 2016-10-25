module.exports.closestCluster = closestCluster;
module.exports.address = address;

var turf = require('@turf/turf');
var _ = require('lodash');

function address(name, pool, cb) {
    pool.query(`
        INSERT INTO address_cluster (text, _text, number, geom) (
            SELECT
                '${name}'       AS text,
                _text           AS _text,
                number          AS number,
                geom            AS geom
            FROM (
                SELECT
                    MAX(_text)                              AS _text,
                    unnest(ST_ClusterWithin(geom, 100))     AS geom,
                    array_to_string(array_agg(number), ',') AS number
                FROM address
                WHERE text = '${name}'
            ) f
        );
    `, function(err, res) {
        if (err) return cb(err);

        return cb();
    });
}

function closestCluster(str, addresses) {
    if (str.geometry.type !== 'LineString') return null; //I only deal with linestrings

    if (!str.properties.name) {
        //Dont really like circles either
        if (_.isEqual(str.geometry.coordinates[0], str.geometry.coordinates[str.geometry.coordinates.length-1])) return null;
    }

    var closest = [];

    var buff = buffer(str, 0.1);
    var within = { type: 'FeatureCollection', features: [] };

    for (var addrs_it = 0; addrs_it < addresses.features.length; addrs_it++) {
        var addr = addresses.features[addrs_it];

        var pts = addr.geometry.coordinates.filter(function(pt) {
            return turf.inside(turf.point(pt), buff);
        });
        if (pts.length > 0) {
            within.features.push(turf.multiPoint(pts, addr.properties));
        }
    }

    within.features.sort(function(a, b) {
        return b.geometry.coordinates.length - a.geometry.coordinates.length
    });

    return within.features.length > 0 ? within.features : null;
}
