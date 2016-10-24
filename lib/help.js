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
        case ('map'):
            console.log('usage: index.js map [--in-network=<FILE.geojson>] [--in-address=<FILE.geojson>] [--output=<FILE.geojson>]');
            console.log('');
            console.log('[options]:');
            console.log('   --in-network=<FILE.geojson>     geojson of street network');
            console.log('   --in-address=<FILE.geojson>     geojson of address points');
            console.log('   --db="<DATABASE>"               Name of database to connect to w/ user postgres');
            console.log('   --output=<FILE.geojson>         output generated ITP lines');
            console.log('   --map-network=<MAP.js>          [optional] Transformative input mapping for street network');
            console.log('   --map-address=<MAP.js>          [optional] Transformative input mapping for addresses');
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
            console.log('usage: index.js <command> [--version] [--help]');
            console.log('');
            console.log('<command>:');
            console.log('    help                      Displays this message');
            console.log('    convert  [--help]         Convert default line delimited geojson to featurecollection');
            console.log('    map      [--help]         Create interpolation from tiles');
            console.log('    test     [--help]         Use raw addresses to query generated ITP output to check for completeness');
            console.log('');
            console.log('[options]:');
            console.log('    --version, -v           Displays version information');
            console.log('    --help                  Prints this help message');
            console.log('');
            break;
    }
}
