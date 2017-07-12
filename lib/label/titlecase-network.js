const titlecase = require('./titlecase');

module.exports = (cc) => {
    let opts = { favor: 'network' };
    if (cc) opts.cc = cc;
    return titlecase(opts);
};
