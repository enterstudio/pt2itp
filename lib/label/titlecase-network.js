const titlecase = require('./titlecase');

module.exports = (opts) => {
    opts.favor = 'network';
    return titlecase(opts);
};
