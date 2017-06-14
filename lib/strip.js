const fs = require('fs');
const path = require('path');
const readline = require('readline');

module.exports = function(argv, cb) {
    if (!argv) return cb(new Error('options object required'))

    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'input',
                'output'
            ],
            alias: {
                input: 'i',
                output: 'o'
            }
        });
    });

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
        outStream = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));
    } else {
        stdout = true;
        outStream = process.stdout;
    }

    let rl = readline.createInterface({
        input: inStream,
        output: outStream
    });

    rl.on('line', (line) => {
        if (!line) return;

        let feat = JSON.parse(line);

    });

    rl.on('error', (err) => {
        return cb(err);
    });
}
