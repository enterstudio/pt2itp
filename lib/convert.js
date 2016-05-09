var fs = require('fs');
var turf = require('turf');
var path = require('path');
var readline = require('readline');
var first = true;

module.exports = function(argv) {
    var rl = readline.createInterface({
        input: fs.createReadStream(path.resolve(__dirname, '..', argv.input)),
        output: fs.createWriteStream(path.resolve(__dirname, '..', argv.output))
    });

    rl.output.write('{\n') 
    rl.output.write('   "type": "FeatureCollection",\n');
    rl.output.write('   "features": [\n');

    rl.on('line', function(line) {
        var feats = JSON.parse(line);

        //DEBUG style output
        if (!feats.features) {
            feats = [feats];
        }
        for (feat_it = 0; feat_it < feats.length; feat_it++) {
            if (!first) rl.output.write(',\n')
            else first = false;

            rl.output.write('       ' + JSON.stringify(feats[feat_it]));
        }
    });

    rl.on('error', function(err) {
        console.error(err.toString());
        process.exit(1);
    });

    rl.on('close', function() {
        rl.output.write('\n');
        rl.output.write('   ]\n');
        rl.output.write('}\n');
    });
}
