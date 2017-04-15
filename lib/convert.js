const fs = require('fs');
const turf = require('@turf/turf');
const path = require('path');
const readline = require('readline');

module.exports = function(argv, cb) {
    if (!argv) return cb(new Error('options object required'))

    let first = true;

    let inStream;
    if (argv.input) {
        inStream = fs.createReadStream(path.resolve(__dirname, '..', argv.input));
    } else {
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        inStream = process.stdin;
    }

    let outStream;
    let stdout = false;
    if (argv.output) {
        outStream = fs.createWriteStream(path.resolve(__dirname, '..', argv.output), {autoClose: false});
    } else {
        stdout = true;
        outStream = process.stdout;
    }

    let rl = readline.createInterface({
        input: inStream,
        output: outStream
    });

    rl.output.write('{\n')
    rl.output.write('   "type": "FeatureCollection",\n');
    rl.output.write('   "features": [\n');

    rl.on('line', (line) => {
        let feats = JSON.parse(line);

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

        for (let feat_it = 0; feat_it < feats.length; feat_it++) {
            if (!first) rl.output.write(',\n');
            else first = false;

            rl.output.write('       ' + JSON.stringify(feats[feat_it]));
        }
    });

    rl.on('error', (err) => {
        return cb(err);
    });

    rl.on('close', onClose);

    function onClose() {
        rl.output.write('\n');
        rl.output.write('   ]\n');
        rl.output.write('}\n');

        if (!stdout) {
            rl.output.end(() => {
                return cb();
            });
        } else {
            return cb();
        }
    }
}
