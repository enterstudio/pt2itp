var fs = require('fs');
var turf = require('turf');
var path = require('path');
var readline = require('readline');
var first = true;

module.exports = function(argv, cb) {
    if (!argv) return cb(new Error('options object required'))
    if (!argv.input) return cb(new Error('input path required'));
    if (!argv.output) return cb(new Error('output path required'));


    var rl = readline.createInterface({
        input: fs.createReadStream(path.resolve(__dirname, '..', argv.input)),
        output: fs.createWriteStream(path.resolve(__dirname, '..', argv.output), {
            autoClose: false 
        })
    });

    rl.output.write('{\n') 
    rl.output.write('   "type": "FeatureCollection",\n');
    rl.output.write('   "features": [\n');

    rl.on('line', function(line) {
        var feats = JSON.parse(line);

        //DEBUG style output
        if (!feats.features && feats.type === 'Feature') {
            feats = [feats];
        } else if (['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].indexOf(feats.type) !== -1) {
            feats = [{
                type: 'Feature',
                properties: {},
                geometry: feats
            }]
        } else {
            feats = feats.features;
        }

        for (feat_it = 0; feat_it < feats.length; feat_it++) {
            if (!first) rl.output.write(',\n')
            else first = false;

            rl.output.write('       ' + JSON.stringify(feats[feat_it]));
        }
    });

    rl.on('error', function(err) {
        return cb(err);
    });

    rl.on('close', function() {
        rl.output.write('\n');
        rl.output.write('   ]\n');
        rl.output.write('}\n');

        rl.output.end(function () {
            return cb();
        });
    });
}
