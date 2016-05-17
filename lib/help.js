module.exports = function(argv) {
    switch (argv._[2]) {
        case ('map'):
            console.log('usage: index.js build [--in-network=<FILE.mbtiles>] [--in-address=<FILE.mbtiles>] [--output=<FILE.mbtiles>]');
            console.log('');
            console.log('[options]:');
            console.log('   --in-network=<FILE.mbtiles>     mbtiles of street network');
            console.log('   --in-address=<FILE.mbtiles>     mbtiles of address points');
            console.log('   --output=<FILE.geojson>         output generated ITP lines');
            console.log('   --tokens=<TOKEN.json>           Abbreviation tokens to match');
            console.log('   --debug                         [optional] output debuggable ITP lines');
            console.log('   --workers=NUM                   [optional] control number of workers');
            console.log('');
            console.log('[debug options]');
            console.log('   --coord=<lng,lat>         Lat Lng coordates of tile to process (requires --zoom)');
            console.log('   --zoom=<zoom>             Zoom level of tile to process');
            console.log('   --xy=<x,y>                XY of tile to process (requires --zoom)');
            break;
        case ('convert'):
            console.log('usage: index.js convert [--input=<FILE.geojson>] [--output=<FILE.geojson>]');
            console.log('');
            console.log('[options]:');
            console.log('   --output=<FILE.geojson>         Single GeoJSON FeatureCollection');
            console.log('   --input=<FILE.geojson>          Line delimited GeoJSON FeatureCollections');
            console.log('');
            break;
        default:
            console.log('usage: index.js [--version] <command>');
            console.log('');
            console.log('<command>:');
            console.log('    help                      Displays this message');
            console.log('    debug    [--help]         Generate debug info for a given tile or latlng');
            console.log('    convert  [--help]         Convert default line delimited geojson to featurecollection');
            console.log('    map      [--help]         Create interpolation from tiles');
            console.log('');
            console.log('[options]:');
            console.log('    --version, -v           Displays version information');
            console.log('');
            break;
    }
}
