const turf = require('@turf/turf');

module.exports = {
    det2D: (start, end, query) => {
        return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]);
    },

    sign: (num) => {
        return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN;
    },

    id: (feat) => {
        feat.id =  Math.floor((Math.random() * 2147483647) + 1);

        return feat;
    }
}
