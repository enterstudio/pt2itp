/**
 * Exposes a map function to convert/filter address numbers to integers
 *
 * @param {Object} feat     GeoJSON feature to convert/filter
 * @return {Object|false}   Converted GeoJSON feature or false if it cannot be converted.
 */

module.exports.map = function(feat) {
    //Skip points & Polygons
    if (feat.geometry.type !== 'Point') return false;
    if (!feat.properties || !feat.properties.number) return false;
    if (!feat.properties || !feat.properties.street) return false;

    let uniq = feat.properties.number.match(/\d+/);
    if (!uniq) return false;

    feat.properties.number = uniq[0];

    return feat;
}
