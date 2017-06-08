const turf = require('@turf/turf');

module.exports = {
    det2D: (start, end, query) => {
        return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]);
    },

    sign: (num) => {
        return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN;
    },

    id: (feat) => {
        let geom;

        if (feat.geometry.type === 'GeometryCollection') {
            geom = turf.pointOnSurface(turf.envelope(feat.geometry.geometries[0])).geometry.coordinates;
        } else {
            geom = turf.pointOnSurface(turf.envelope(feat)).geometry.coordinates;
        }

        let centre = geom.map((pt) => {
            if (pt < 0) pt = pt * -1;
            return String(pt).substring(String(pt).length - 5, String(pt).length).replace(',', '');
        });

        feat.id = parseInt(centre.join(''));

        if (!feat.id) feat.id = parseInt(Math.floor(Math.random() * 10000000));

        return feat;
    }
}
