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

    var tilereduce = TileReduce({
        zoom: 14,
        log: false,
        maxWorkers: argv.workers,
        mapOptions: argv,
        sourceCover: 'Streets',
        output: fs.createWriteStream(path.resolve(__dirname, '..', argv.output)),
        sources: [{
            name: 'Addresses',
            mbtiles: path.resolve(__dirname, '..', argv['in-address']),
            layers: ['addresses']
        },{
            name: 'Streets',
            mbtiles: path.resolve(__dirname, '..', argv['in-network']),
            layers: ['streets']
        }],
        map: __dirname+'/worker.js'
    }).on('start', function() {
        console.log('Beginning Processing');
    }).on('reduce', function(err, tile) { 
        if (err) console.error('['+tile.join(',')+'] - ' + err)
        else console.log('['+tile.join(',')+'] - Finished');
    });
}
