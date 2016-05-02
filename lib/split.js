var turf = require('turf');
var _ = require('lodash');
var path = require('path');
var mapnik = require('mapnik');
var Q = require('d3-queue');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

module.exports = function(streets, address, street_split, xyz) {

    var tile = new mapnik.VectorTile(xyz[2],xyz[0],xyz[1]); //Must be in zxy

    var q = Q.queue();

    var result = {};

    var identicalStreets = {
        type: 'FeatureCollection',
        features: []
    }

    street_split.forEach(function(streetID) {
        streets.features[streetID].properties.streetID = streetID;
        identicalStreets.features.push(streets.features[streetID])

        result[streetID] = [];
    });

    tile.addGeoJSON(JSON.stringify(identicalStreets), 'data');

    var geojson = tile.toGeoJSONSync('data');

    address.geometry.coordinates.forEach(function(coord) {
        q.defer(function(cb) {
            tile.query(coord[0], coord[1], {
                tolerance: 100000,
                layer: 'data'
            }, function(err, results) {
                result[results[0].attributes().streetID].push(streets[results[0].attributes().streetID])
                console.error(results[0].attributes().streetID)
                return cb(null, true);
            });
        });
    });

    q.awaitAll(function(err, res) {
    });
}
