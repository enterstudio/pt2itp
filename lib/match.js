const linker = require('./linker');
const pg = require('pg');
const Queue = require('d3-queue').queue;

let pool;
let id;

process.on('message', (message) => {
    if (Array.isArray(message)) {
        const matchQ = Queue();

        for (let networkid of message)
            matchQ.defer(match, networkid);

        matchQ.await((err) => {
            process.send({
                id: id,
                error: err,
                jobs: message.length
            });
        });
    } else {
        init(message);
        id = message.id;

        process.send({
            id: id,
            jobs: 0
        });
    }
});

//Only called by tests - child process kills this automatically
function kill() {
    pool.end();
}

function init(opts) {
    pool = new pg.Pool(opts.pool);
}

function match(id, cb) {
    pool.query(`
        SELECT
            network.text AS network,
            network.text_tokenless AS network_text_tokenless,
            addr.id,
            addr.text,
            addr._text AS _text,
            addr.text_tokenless AS text_tokenless
        FROM
            address_cluster addr,
            network_cluster AS network
        WHERE
            network.id = ${id} AND
            ST_Intersects(network.buffer, addr.geom);
    `, (err, res) => {
        if (err) return cb(err);

        if (!res.rows.length) return cb();

        let address = linker({
            id: id,
            text: res.rows[0].network,
            _text: res.rows[0].network_text,
            text_tokenless: res.rows[0].network_text_tokenless
        }, res.rows)

        if (!address) return cb();

        pool.query(`
            UPDATE network_cluster
            SET address = ${address.id}
            WHERE network_cluster.id = ${id};
        `, (err, res) => {
            return cb(err);
        });
    });
}

module.exports.main = match;
module.exports.init = init;
module.exports.kill = kill;
