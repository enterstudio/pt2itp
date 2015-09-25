var TileReduce = new require('tile-reduce');
var itp = require('./itp');

module.exports = function(argv) {

    var bounds = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -77.25242614746094,
              38.905194197410545
            ],
            [
              -77.25242614746094,
              38.95807395541904
            ],
            [
              -77.14805603027344,
              38.95807395541904
            ],
            [
              -77.14805603027344,
              38.905194197410545
            ],
            [
              -77.25242614746094,
              38.905194197410545
            ]
          ]
        ]
      }
    }

    var opts = {
        zoom: 14,
        tileLayers: [{
            name: 'Addresses',
            mbtiles: __dirname+'/../data/addresses.mbtiles',
            layers: ['addresses']
        },{
            name: 'Streets',
            mbtiles: __dirname+'/../data/streets.mbtiles',
            layers: ['streets']
        }],
        map: __dirname+'/itp.js'
    };

    var tilereduce = TileReduce(bounds, opts);

    tilereduce.on('reduce', function(result) {
        //console.log(JSON.stringify(result));
    });

    tilereduce.run();
}
