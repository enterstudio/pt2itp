var turf = require('turf');
var path = require('path');

module.exports = function(data, xyz, writeData, done) {
    if (!global.mapOptions) global.mapOptions = {};

    if (global.mapOptions.map) {
        remap = require(__dirname + '/../' + global.mapOptions.map);
        data = remap.map(data);
    }

    if (!global.mapOptions.zoom) {
        global.mapOptions.zoom =  xyz[2];
    }

    if (!data.Addresses.addresses || !data.Addresses.addresses.features || data.Addresses.addresses.features.length === 0) return done(null, 'No address data in: ' + xyz.join(','));
    if (!data.Streets.streets || !data.Streets.streets.features || data.Streets.streets.features.length === 0) return done(null, 'No street data in: ' + xyz.join(','));

    if (global.mapOptions.raw === 'addresses') {
        data.Addresses.addresses.features.forEach(function (addr) {
            writeData(JSON.stringify(addr) + '\n');
        });
        return done(null, 'dumped: ' + xyz.join(','));
    }

}
