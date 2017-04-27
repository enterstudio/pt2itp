module.exports = split;

const interpolize = require('./interpolize');
const explode = require('./explode');

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
            if (addr[2] % 1 != 0 && argv.unitMap) {
                let unit = parseInt(String(addr[2]).split('.')[1]);
                let num = String(addr[2]).split('.')[0];

                addr[2] = `${num}${argv.unitMap.get(unit)}`;
            }

            res.number.push(addr.pop())
            return addr;
        });

        //Split MultiLineString into individual LineStrings in FeatureCollection
        let network = JSON.parse(res.network);
        let networkFC = [];
        for (let ln_it = 0; ln_it < network.coordinates.length; ln_it++) {
            networkFC.push(turf.lineString(network.coordinates[ln_it]));
        }

        network = explode(turf.featureCollection(networkFC));

        let feat = {
            text: res.text,
            _text: res._text,
            number: res.number,
            network: network,
            address: res.address
        }

        feat.network = explode(feat.network);

        let cluster = [];
        let addressCluster = [];

        for (let pt_it = 0; pt_it < feat.address.coordinates.length; pt_it++) {
            let pt = turf.point(feat.address.coordinates[pt_it]);

            let currentMatch = {
                dist: Infinity,
                ln: false
            };

            for (let ln_it = 0; ln_it < feat.network.features.length; ln_it++) {
                let ln = feat.network.features[ln_it].geometry;

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
            //If Network Doesn't have corresponding Address Cluster
            if (!cluster[pt_it]) {
                output.write(JSON.stringify({
                    type: 'Feature',
                    properties: {
                        'carmen:text': feat._text,
                        'carmen:addressnumber': [ null ],
                        'carmen:parityl': [ null ],
                        'carmen:lfromhn': [ null ],
                        'carmen:ltohn':   [ null ],
                        'carmen:parityr': [ null ],
                        'carmen:rfromhn': [ null ],
                        'carmen:rtohn':   [ null ],
                        'carmen:center': turf.pointOnSurface(feat.network.features[pt_it].geometry).geometry.coordinates,
                        'carmen:rangetype': 'tiger',
                        'carmen:geocoder_stack': argv.country ? argv.country : false
                    },
                    geometry: {
                        type: 'GeometryCollection',
                        geometries: [ feat.network.features[pt_it].geometry ]
                    }
                }) + '\n');

                continue;
            }

            let address = turf.multiPoint(cluster[pt_it], {
                numbers: addressCluster[pt_it],
                text: feat.text,
                'carmen:text': feat._text
            });
            let street = turf.feature(feat.network.features[pt_it].geometry, {
                text: feat.text,
                'carmen:text': feat._text
            });

            result = interpolize(street, address, { zoom: 14 });

            output.write(JSON.stringify({
                type: 'Feature',
                properties: {
                    'carmen:text': feat._text,
                    'carmen:addressnumber': [ null, address.properties.numbers ],
                    'carmen:parityl': [ result.properties['carmen:parityl'], null ],
                    'carmen:lfromhn': [ result.properties['carmen:lfromhn'], null ],
                    'carmen:ltohn':   [ result.properties['carmen:ltohn'], null ],
                    'carmen:parityr': [ result.properties['carmen:parityr'], null ],
                    'carmen:rfromhn': [ result.properties['carmen:rfromhn'], null ],
                    'carmen:rtohn':   [ result.properties['carmen:rtohn'], null ],
                    'carmen:center': turf.pointOnSurface(feat.network.features[pt_it].geometry).geometry.coordinates,
                    'carmen:rangetype': 'tiger',
                    'carmen:geocoder_stack': argv.country ? argv.country : false
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        feat.network.features[pt_it].geometry,
                        { type: 'MultiPoint', coordinates: address.geometry.coordinates }
                    ]
                }
            }) + '\n');


            //Add Network to collection
            ['carmen:parityl', 'carmen:lfromhn', 'carmen:ltohn', 'carmen:parityr', 'carmen:rfromhn', 'carmen:rtohn'].forEach((prop) => {
                ln[prop] = ln[prop].concat(result.properties[prop]);
            });
            ln.coords.push(result.geometry.coordinates);
        }

        return cb();
    });
}
