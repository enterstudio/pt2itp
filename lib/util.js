var tb = require('tilebelt');
var cover = require('tile-cover');

module.exports = main;

function main(argv, cb) {
    if (argv.xy && argv.coords) {
        return cb(new Error('--xy and --coords cannot be used together'));
    }

    if (argv.zoom && (argv.xy || argv.coords)) {
        if (argv.xy) {
            var split = argv.xy.split(',');

            if (split.length !== 2) {
                return cb(new Error('--xy must be in format --xy <x,y>'));
            }
            var tile = [argv.xy[0], argv.xy[1], argv.zoom];
        } else {
            var split = argv.coords.split(',');

            if (split.length !== 2) {
                return cb(new Error('--coords must be in format --coords <lng,lat>'));
            }
            var tile = cover.tiles({ type: "Point", coordinates: split } , { min_zoom: argv.zoom, max_zoom: argv.zoom})[0];

        }

        return cb(null, JSON.stringify({ type: 'Feature', properties: {}, geometry: tb.tileToGeoJSON(tile)}));
    }
}
