/**
 * Exposes a post function to convert/filter ITP geometries as the last step before ouput
 *
 * @param {Object} feat     GeoJSON feature to convert/filter
 * @return {Object}         Output GeoJSON feature to write to output
 */
module.exports.post = (feat) => {
    if (!feat || !feat.properties || !feat.properties['carmen:text']) return feat;

    let text = feat.properties['carmen:text'].split(',');

    let prefixed = false;
    let postfixed = false;

    postRegex = /\s(south|s|north|n|east|e|west|w)$/i;
    preRegex = /^(south|s|north|n|east|e|west|w)\s/i;

    for (let t of text) {
        if (!postfixed && t.match(postRegex)) {
            postfixed = t;
        }

        if (!prefixed && t.match(preRegex)) {
            prefixed = t;
        }

        if (prefixed && postfixed) return feat;
    }

    if (prefixed) {
        let cardinal = prefixed.match(preRegex);

        let name = prefixed.replace(preRegex, '');

        text.push(`${name} ${cardinal[0]}`.trim());
    }

    if (postfixed) {
        let cardinal = postfixed.match(postRegex);
        let name = postfixed.replace(postRegex, '');

        text.push(`${cardinal[0]}${name}`.trim());
    }

    feat.properties['carmen:text'] = text.join(',');

    return feat;
}
