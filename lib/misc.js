const turf = require('@turf/turf');
const Flake = require('flake-idgen');
const flakeIdGen = new Flake();
const intformat = require('biguint-format');

module.exports = {
    det2D: (start, end, query) => {
        return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]);
    },

    sign: (num) => {
        return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN;
    },

    id: (feat) => {
        feat.id = intformat(flakeIdGen.next(), 'dec');

        return feat;
    }
}
