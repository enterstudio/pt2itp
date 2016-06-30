//Exposes map function & recieves geojson representation of tile.
//Must return geojson representation of tile with tile.Addresses (properties: street & address)
//  and tile.Streets (properties: street)

//This module maps streets from http://osmlab.github.io/osm-qa-tiles/ into the proper format
//Addresses must be provided from another source

module.exports.map = function(tile, argv) {

    if (!tile.Streets.osm) {
        tile.Streets = {};
        return tile;
    }


    var streets = {
        type: 'FeatureCollection',
        features: []
    }

    for (var feat_it = 0; feat_it < tile.Streets.osm.features.length; feat_it++) {
        var feat = tile.Streets.osm.features[feat_it];
       
        //Skip points & Polygons
        if (feat.geometry.type !== 'LineString' && feat.geometry.type !== 'MultiLineString') continue;

        //Skip non-highways
        if (!feat.properties.highway) continue;

        var accepted = [
            'motorway',
            'trunk',
            'primary',
            'secondary',
            'tertiary',
            'residential',
            'unclassified',
            'living_street',
            'road'
        ];

        //Eliminate all highway types not on accepted list
        if (accepted.indexOf(feat.properties.highway) === -1) continue;

        names = [];

        function addName(name) {
            if (!name) return;

            //OSM uses ; to separate in a single value
            name = name.split(';');
            name.forEach(function(n) {
                if (n && n.length > 0) names.push(n);
            });
        }

        ['name', 'loc_name', 'alt_name'].forEach(function(key) {
            addName(feat.properties[key]);
        });

        streets.features.push({
            type: 'Feature',
            properties: {
                street: names.length === 1 ? names[0] : names //String for 1 value array for many
            },
            geometry: feat.geometry
        });
    }

    tile.Streets = {
        streets: streets
    };

    return tile;
}
