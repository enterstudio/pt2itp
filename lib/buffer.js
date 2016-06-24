var turf = require('turf');

module.exports = buffer;

function buffer(line, dist) {
    if (line.type !== 'LineString' || (line.type === 'Feature' && line.geometry.type !== 'LineString')) {
        throw new Error('Buffered geometry must be LineString or Feature LineString');
    } else if (!dist) {
        throw new Error('Buffer distance requred');
    }
}
