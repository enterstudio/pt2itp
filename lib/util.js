var tb = require('tilebelt');
var cover = require('tile-cover');

module.exports = main;

function main(argv) {
    if (argv.zoom && (argv.xy || argv.coords)) {
        if (argv.xy) {
            var split = argv.xy.split(',');

            if (!split.length === 2) {
                console.error('--xy must be in format --xy <x,y>');
                process.exit(1);
            }
            var tile = [argv.xy[0], argv.xy[1], argv.zoom];
        } else {
            var split = argv.coords.split(',');

            if (!split.length === 2) {
                console.error('--coords must be in format --coords <lng,lat>');
                process.exit(1);
            }
            var tile = cover.tiles({ type: "Point", coordinates: split } , { min_zoom: argv.zoom, max_zoom: argv.zoom})[0];

        }

        console.log(JSON.stringify({ type: 'Feature', properties: {}, geometry: tb.tileToGeoJSON(tile)}));
    }
}
