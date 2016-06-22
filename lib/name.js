var turf = require('turf');
var path = require('path');
var cluster = require('./cluster');
var tokenize = require('./tokenize');
var _ = require('lodash');

module.exports = function(data, xyz, writeData, done) {
    if (!global.mapOptions) global.mapOptions = {};

    if (global.mapOptions.map) {
        remap = require(__dirname + '/../' + global.mapOptions.map);
        data = remap.map(data, global.mapOptions);
    }

    if (!global.mapOptions.zoom) {
        global.mapOptions.zoom =  xyz[2];
    }

    if (!data.Addresses.addresses || !data.Addresses.addresses.features || data.Addresses.addresses.features.length === 0) return done(null, 'No address data in: ' + xyz.join(','));
    if (!data.Streets.streets || !data.Streets.streets.features || data.Streets.streets.features.length === 0) return done(null, 'No street data in: ' + xyz.join(','));

    if (global.mapOptions.raw === 'addresses') {
        data.Addresses.addresses.features.forEach(function(addr) {
            writeData(JSON.stringify(addr) + '\n');
        });
        return done(null, 'dumped: ' + xyz.join(','));
    } else if (global.mapOptions.raw === 'streets') {
        data.Streets.streets.features.forEach(function(street) {
            writeData(JSON.stringify(street) + '\n');
        });
        return done(null, 'dumped: ' + xyz.join(','));
    }

    var addresses = cluster(tokenizeFeat(data.Addresses.addresses)).named;
    var streets = cluster(tokenizeFeat(data.Streets.streets)).unnamed;

    var bugs = 0; //Running tally of number of problematic geoms

    var filterStr = {
        type: 'FeatureCollection',
        features: []
    };

    //Iterate through streets and bin based on error type:
    for (var str_it = 0; str_it < streets.features.length; str_it++) {
        var str = streets.features[str_it];
        
        if (str.properties.street.length === 0) {
            for (ls_it = 0; ls_it < str.geometry.coordinates.length; ls_it++) {
                var ls = str.geometry.coordinates[ls_it];

                var feat = {
                    type: 'Feature',
                    properties: str.properties,
                    geometry: {
                        type: 'LineString',
                        coordinates: ls
                    }
                };

                if (global.mapOptions.debug) {
                    var closest = closestCluster(feat, addresses);

                    if (closest) {
                        var featCollect = {
                            type: 'FeatureCollection',
                            features: closest.concat([feat])
                        }

                        writeData(JSON.stringify(featCollect) + '\n');
                        bugs++;
                    }
                } else {
                    writeData(JSON.stringify(feat) + '\n');
                    bugs++;
                }


                continue;
            }
        }

        for (var addr_it = 0; addr_it < addresses.features.length; addr_it++) {
            var addr = addresses.features[addr_it];

            //If the street names are the same - eliminate
            if (_.isEqual(addr.properties.street, str.properties.street)) continue;
            else filterStr.features.push(str);
        }
    }

    return done(null, 'Finished - ' + bugs + ' matched');
}

function tokenizeFeat(feats) {
    feats.features = feats.features.map(function(feat) {
        if (feat.properties.street) {
            feat.properties['carmen:text'] = feat.properties.street;
            feat.properties.street = tokenize(feat.properties.street, global.mapOptions);
        } else {
            feat.properties.street = [];
        }
        return feat;
    });
    return feats;
}

function closestCluster(str, addresses) {
    if (str.geometry.type !== 'LineString') return null; //I only deal with linestrings

    //Don't really like circles either
    if (_.isEqual(str.geometry.coordinates[0], str.geometry.coordinates[str.geometry.coordinates.length-1])) return null;

    var closest = [];

    for (var addr_it = 0; addr_it < addresses.features.length; addr_it++) {
        var addr = addresses.features[addr_it];       
 
        for (var pt_it = 0; pt_it < addr.geometry.coordinates.length; pt_it++) {
            var dist = turf.distance(
                turf.pointOnLine(str, turf.point(addr.geometry.coordinates[pt_it])),
                turf.point(addr.geometry.coordinates[pt_it]),
                'kilometers'
            );
            if (dist <= 0.200) { //I don't really care about addresses further away than this
                closest.push({
                    dist: dist,
                    pt: addr.geometry.coordinates[pt_it],
                    cluster: addr_it
                });
            }
        }
    }

    closest.sort(function(a, b) {
        return a.dist - b.dist;
    });

    if (closest.length > 0) {
        var current = closest[0].cluster;
        var res = [addresses.features[current]]
        for (var closest_it = 1; closest_it < closest.length; closest_it++) {
            if (current === closest[closest_it].cluster) continue;

            res.push(addresses.features[closest[closest_it].cluster]);
            break;
        }

        if (res[0]) res[0].properties['marker-color'] = '#008000';
        if (res[1]) res[1].properties['marker-color'] = '#003200';

        return res;
    } else {
        return null;
    }
}
