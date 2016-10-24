module.exports = cluster;
module.exports.closestCluster = closestCluster;

var turf = require('@turf/turf');
var _ = require('lodash');

function cluster(name, db, type, cb) {
    db.all('SELECT id, text, data FROM '+type+' WHERE text = $name', {
        $name: name
    }, function(err, res) {
        if (err) return cb(err);

        var res = [];

        for (var res_it = 0; res_it < res.length; res_it++) {
            var feat = JSON.parse(res[res_it]);
            var processed = false;

        }

        function merge(a, b) {
            for (a_it = 0; a_it < a.length; a_it++) {
                for (b_it = 0; b_it < b.length; b_it++) {
                    if (turf.distance(a, b, 'kilometers') < 10) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        }
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
