var turf = require('@turf/turf');
var _ = require('lodash');
var path = require('path');
var mapnik = require('mapnik');
var Q = require('d3-queue');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

module.exports = function(streets, address, street_split, xyz, callback) {
    var tile = new mapnik.VectorTile(xyz[2],xyz[0],xyz[1]); //Must be in zxy

    var q = Q.queue();

    var result = {};

    var identicalStreets = {
        type: 'FeatureCollection',
        features: []
    }

    street_split.forEach(function(streetID) {
        streetFeat = _.cloneDeep(streets.features[streetID]);
        streetFeat.properties.streetID = streetID;

        identicalStreets.features.push(streetFeat)

        result[streetID] = [];
    });

    tile.addGeoJSON(JSON.stringify(identicalStreets), 'data');

    address.geometry.coordinates.forEach(function(coord, coord_it) {
        q.defer(function(cb) {
            tile.query(coord[0], coord[1], {
                tolerance: 1000,
                layer: 'data'
            }, function(err, results) {
                if (results.length === 0) return cb(null, false);
                result[results[0].attributes().streetID].push(coord_it)
                return cb(null, true);
            });
        });
    });

    q.awaitAll(function(err, res) {
        var newRes = {};

        Object.keys(result).forEach(function(street_id) {
            newRes[street_id] = {
                type: 'Feature',
                properties: {
                    street: address.properties.street,
                    numbers: []
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: []
                }
            };

            result[street_id].forEach(function(addr_id) {
                newRes[street_id].geometry.coordinates.push(address.geometry.coordinates[addr_id]);
                newRes[street_id].properties.numbers.push(address.properties.numbers[addr_id]);
            });
        });

        return callback(null, newRes);
    });
}
