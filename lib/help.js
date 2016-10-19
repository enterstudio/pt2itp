module.exports = function(argv) {
    switch (argv._[2]) {
        case ('test'):
            console.log('usage: index.js test [--addresses=<FILE.geojson>] [--itp=<FILE.geojson>] [--debug] [--query]');
            console.log('');
            console.log('[options]:');
            console.log('   --itp=<FILE.geojson>          geojson of pt2itp output for a given tile');
            console.log('   --addresses=<FILE.geojson>    geojson of raw addresses (can be obtained with --raw option');
            console.log('   --query="100 Example Rd"      [optional] Used instead of --addresses to query a single address');
            console.log('   --debug                       [optional] Print the problematic addresses to STDOUT');
            break;
        case ('name'):
            console.log('usage: index.js name [--in-network=<FILE.mbtiles>] [--in-address=<FILE.mbtiles>] [--output=<FILE.mbtiles>]');
            console.log('');
            console.log('[options]:');
            console.log('   --in-network=<FILE.mbtiles>     mbtiles of street network');
            console.log('   --in-address=<FILE.mbtiles>     mbtiles of address points');
            console.log('   --output=<FILE.geojson>         output generated ITP lines');
            console.log('   --tokens=<TOKEN.json>           [optional] Abbreviation tokens to match');
            console.log('   --debug                         [optional] output debuggable ITP lines');
            console.log('   --workers=NUM                   [optional] control number of workers');
            console.log('');
            console.log('[debug options]');
            console.log('   --coord=<lng,lat>               Lat Lng coordates of tile to process (requires --zoom)');
            console.log('   --zoom=<zoom>                   Zoom level of tile to process');
            console.log('   --xy=<x,y>                      XY of tile to process (requires --zoom)');
            break;
        case ('map'):
            console.log('usage: index.js map [--in-network=<FILE.geojson>] [--in-address=<FILE.geojson>] [--output=<FILE.geojson>]');
            console.log('');
            console.log('[options]:');
            console.log('   --in-network=<FILE.geojson>     geojson of street network');
            console.log('   --in-address=<FILE.geojson>     geojson of address points');
            console.log('   --output=<FILE.geojson>         output generated ITP lines');
            console.log('   --tokens=<TOKEN.json>           [optional] Abbreviation tokens to match');
            console.log('   --name                          [optional] Try to autoname unnamed streets');
            console.log('   --debug                         [optional] output debuggable ITP lines');
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
            console.log('    convert  [--help]         Convert default line delimited geojson to featurecollection');
            console.log('    map      [--help]         Create interpolation from tiles');
            console.log('    name     [--help]         Find unnamed streets');
            console.log('    test     [--help]         Use raw addresses to query generated ITP output to check for completeness');
            console.log('');
            console.log('[options]:');
            console.log('    --version, -v           Displays version information');
            console.log('');
            break;
    }
}
