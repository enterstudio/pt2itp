var TileReduce = new require('tile-reduce');

module.exports = function(argv) {
    var tilereduce = TileReduce({
        zoom: 14,
        sourceCover: 'Streets',
        sources: [{
            name: 'Addresses',
            mbtiles: __dirname+'/../data/addresses.mbtiles',
            layers: ['addresses']
        },{
            name: 'Streets',
            mbtiles: __dirname+'/../data/streets.mbtiles',
            layers: ['streets']
        }],
        map: __dirname+'/worker.js'
    });

    tilereduce.on('reduce', function(result) {
        //console.log(JSON.stringify(result));
    });

    tilereduce.on('start', function() {

    });

    tilereduce.on('end', function() {

    });
}
