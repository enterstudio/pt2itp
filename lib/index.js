module.exports = index;

/**
 * Index/bucket a stream of geojson features into groups of similiarly named features
 *
 * @param stream of geojson Features to be indexed by `street` property
 * @param type type of geojson feature - either `address` or `network`
 * @param opts optional arguments
 *        opts.tokens - JSON Object in the form of a token replacement file. See ./lib/tokens/ for examples
 * @param cb callback funtion
 * @return fxn in the form fxn(err)
*/

function index(stream, type, opts, cb) {
    
}
