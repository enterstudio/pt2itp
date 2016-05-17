var TileReduce = new require('tile-reduce');
var path = require('path');
var fs = require('fs');

module.exports = function(argv) {
    if (!argv['in-address']) {
        console.error('--in-address=<FILE.mbtiles> argument required');
        process.exit(1);
    } else if (!argv['in-network']) {
       console.error('--in-network=<FILE.mbtiles> argument required');
       process.exit(1);
    } else if (!argv['output']) {
       console.log('--output=<FILE.geojson> argument required');
       process.exit(1);
   }

    if (argv['tokens']) {
        var parsed =  JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', argv.tokens), 'utf8'));
        var tokens = {};
        parsed.forEach(function(parse) {
            parse.sort(function(a, b) {
                return a.length > b.length
            });
            if (parse.length === 1) {
                throw new Error('tokens must be in a min group of two');
            } else if (parse.length > 2) {
                parse.forEach(function(token, it) {
                    if (it === 0) return;

                    tokens[token.toLowerCase()] = parse[0].toLowerCase();
                });
            } else {
                tokens[parse[1].toLowerCase()] = parse[0].toLowerCase();
            }

            argv['tokens'] = tokens;
        });

    }

    if (argv.xy && !argv.zoom) {
        console.error('--xy arg must be used with --zoom');
        process.exit(1);
    }
    if (argv.coords && !argv.zoom) {
        console.error('--coords arg must be used with --zoom');
        process.exit(1);
    }
    if (argv.coords && argv.xy) {
        console.error('--coords && --xy cannot be used together');
        process.exit(1);
    }

    var tiles;
    var geojson;
    if (argv.xy) {
        var split = argv.xy.split(',');

        if (split.length !==2) {
            console.error('--xy arg must be in format x,y');
            process.exit(1);
        }

        tiles = [[split[0], split[1], argv.zoom]];
    } else if (argv.coord) {
        var coord = argv.coord.split(',');
        if (coord.length !==2) {
            console.error('--coord arg must be in format lng,lat');
            process.exit(1);
        }

        geojson = {
            type: 'Point',
            coordinates: coord
        }
    }

    var tilereduce = TileReduce({
        zoom: 14,
        log: false,
        tiles: tiles,
        geojson: geojson,
        maxWorkers: argv.workers,
        mapOptions: argv,
        sourceCover: 'Streets',
        output: fs.createWriteStream(path.resolve(__dirname, '..', argv.output)),
        sources: [{
            name: 'Addresses',
            mbtiles: path.resolve(__dirname, '..', argv['in-address'])
        },{
            name: 'Streets',
            mbtiles: path.resolve(__dirname, '..', argv['in-network'])
        }],
        map: __dirname+'/worker.js'
    }).on('start', function() {
        console.log('Beginning Processing');
    }).on('reduce', function(err, tile) { 
        if (err) console.error('['+tile.join(',')+'] - ' + err)
        else console.log('['+tile.join(',')+'] - Finished');
    }).on('end', function() {
        console.log('Ending Processing');
    });
}
