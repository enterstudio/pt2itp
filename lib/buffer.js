var turf = require('turf');
var _ = require('lodash');

module.exports = buffer;

function buffer(line, dist) {
    if ((line.type !== 'LineString' && line.type !== 'Feature') || (line.type === 'Feature' && line.geometry.type !== 'LineString')) {
        throw new Error('Buffered geometry must be LineString or Feature LineString');
    } else if (!dist) {
        throw new Error('Buffer distance requred');
    }

    var coords = line.type === 'Feature' ? line.geometry.coordinates : line.coordinates;

    var ls = [];
    var rs = [];

    for (var coord_it = 0; coord_it < coords.length; coord_it++) {
        if (coord_it === coords.length - 1) {
            var last = true;
            var a = turf.point(coords[coord_it]);
            var b = turf.point(coords[coord_it - 1]);
        } else {
            var a = turf.point(coords[coord_it]);
            var b = turf.point(coords[coord_it + 1]);
        }
      
        var bearing = turf.bearing(a, b);

        var lsTmp = turf.destination(a, dist, (bearing - 90), 'kilometers');
        var rsTmp = turf.destination(a, dist, (bearing + 90), 'kilometers');

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
