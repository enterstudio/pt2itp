//Exposes map function & recieves geojson representation of tile.
//Must return geojson representation of tile with tile.Addresses (properties: street & address)
//  and tile.Streets (properties: street)

//This module maps streets from http://osmlab.github.io/osm-qa-tiles/ into the proper format
//Addresses must be provided from another source

module.exports.map = function(tile) {

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

        //Can't match without a name
        if (!feat.properties.name) continue;

        streets.features.push({
            type: 'Feature',
            properties: {
                street: feat.properties.name
            },
            geometry: feat.geometry
        });
    }

    console.error(streets.features.length)

    tile.Streets = {
        streets: streets
    };

    return tile;
}
