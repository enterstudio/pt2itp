const ReadLine = require('readline');
const worker = require('../lib/map');
const test = require('tape');
const path = require('path');
const fs = require('fs');
const pg = require('pg');

test('map - in-address error', (t) => {
    worker({
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --in-address=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - in-network error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --in-network=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - output error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --output=<FILE.geojson> argument required');
        t.end();
    });
});

test('map - db error', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        'output': '/tmp/itp.geojson'
    }, (err, res) => {
        t.equals(err.toString(), 'Error: --db=<DATABASE> argument required');
        t.end();
    });
});

test('map - good run', (t) => {
    worker({
        'in-address': './test/fixtures/sg-address.geojson',
        'in-network': './test/fixtures/sg-network.geojson',
        output: '/tmp/itp.geojson',
        debug: true,
        db: 'pt_test'
    }, (err, res) => {
        t.error(err);

        rl = ReadLine.createInterface({
            input: fs.createReadStream('/tmp/itp.geojson')
        });

        rl.on('line', (line) => {
            if (!line) return;

            feat = JSON.parse(line);

            if (feat.properties['carmen:text'] === 'Muscat Street') checkFixture(feat, 'muscat-st');
            if (feat.properties['carmen:text'] === 'Park Road,Parsi Road') checkFixture(feat, 'park-rd');
            if (feat.properties['carmen:text'] === 'Teck Lim Road') checkFixture(feat, 'teck-lim');
            if (feat.properties['carmen:text'] === 'Jalan Kelempong') checkFixture(feat, 'jalam-kelempong');
            if (feat.properties['carmen:text'] === 'Tomlinson Road,Tomlison Road') checkFixture(feat, 'tomlinson');
            if (feat.properties['carmen:text'] === 'Jalan Sejarah') checkFixture(feat, 'jalan-sejrah');
            if (feat.properties['carmen:text'] === 'Changi South Street 3') checkFixture(feat, 'changi');
            if (feat.properties['carmen:text'] === 'Lorong 21a Geylang') checkFixture(feat, 'lorong');
            if (feat.properties['carmen:text'] === 'Ang Mo Kio Industrial Park 3') checkFixture(feat, 'ang-mo');
            if (feat.properties['carmen:text'] === 'De Souza Avenue') checkFixture(feat, 'de-souza');
        });

        rl.on('error', t.error);

        rl.on('close', () => {
            fs.unlinkSync('/tmp/itp.geojson');
            t.end();
        });

        function checkFixture(res, fixture) {
            t.ok(res.id);
            delete res.id;

            let known = JSON.parse(fs.readFileSync(path.resolve(__dirname, `./fixtures/sg-${fixture}`)));

            t.deepEquals(res, known);

            if (process.env.UPDATE) {
                t.fail();
                fs.writeFileSync(path.resolve(__dirname, `./fixtures/sg-${fixture}`), JSON.stringify(res, null, 4));
            }
        }
    });
});

test('drop database', (t) => {
    let pool = new pg.Pool({
        max: 10,
        user: 'postgres',
        database: 'pt_test',
        idleTimeoutMillis: 30000
    });

    pool.query(`
        BEGIN;
        DROP TABLE address;
        DROP TABLE address_cluster;
        DROP TABLE network;
        DROP TABLE network_cluster;
        COMMIT;
    `, (err) => {
        t.error(err);
        pool.end();
        t.end();
    });
});
