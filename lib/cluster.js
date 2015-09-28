module.exports = clusterAddress;

function clusterAddress(feats) {
    var featMap = {};
    var featCluster = {
        type: 'FeatureCollection',
        features: []
    }

    for (var i = 0; i < feats.features.length; i++) {
        var street = feats.features[i].properties.street;
        if (featMap[street]) {
            featMap[street].properties.numbers.push(String(feats.features[i].properties.number));
            featMap[street].geometry.coordinates.push(feats.features[i].geometry.coordinates);
        } else {
            featMap[street] = {
                type: 'Feature',
                properties: {
                    street: street,
                    numbers: [String(feats.features[i].properties.number)]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [feats.features[i].geometry.coordinates]
                }
            }
        }
    }

    for (var i = 0; i < Object.keys(featMap).length; i++) {
        featCluster.features.push(featMap[Object.keys(featMap)[i]]);
    }

    return featCluster;
}
