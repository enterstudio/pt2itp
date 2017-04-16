const turf = require('@turf/turf');
const _ = require('lodash');

module.exports = buffer;

function buffer(line, dist = 0.1) {
    if ((line.type !== 'LineString' && line.type !== 'Feature') || (line.type === 'Feature' && line.geometry.type !== 'LineString')) {
        throw new Error('Buffered geometry must be LineString or Feature LineString');
    } else if (!dist) {
        throw new Error('Buffer distance requred');
    }

    let coords = line.type === 'Feature' ? line.geometry.coordinates : line.coordinates;

    let ls = [];
    let rs = [];

    for (let coord_it = 0; coord_it < coords.length; coord_it++) {
        let last = false;
        let a, b;

        if (coord_it === coords.length - 1) {
            last = true;
            a = turf.point(coords[coord_it]);
            b = turf.point(coords[coord_it - 1]);
        } else {
            a = turf.point(coords[coord_it]);
            b = turf.point(coords[coord_it + 1]);
        }

        let bearing = turf.bearing(a, b);

        let lsTmp = turf.destination(a, dist, (bearing - 90), 'kilometers');
        let rsTmp = turf.destination(a, dist, (bearing + 90), 'kilometers');

        if (!last) {
            ls.push(lsTmp.geometry.coordinates);
            rs.push(rsTmp.geometry.coordinates);
        } else {
            rs.push(lsTmp.geometry.coordinates);
            ls.push(rsTmp.geometry.coordinates);
        }
    }

    //Can be self intersecting
    return {
        type: 'Feature',
        properties: line.properties ? line.properties : {},
        geometry: {
            type: 'Polygon',
            coordinates: [_.concat(ls, rs.reverse(), [ls[0]])]
        }
    }
}

