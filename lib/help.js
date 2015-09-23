module.exports = function() {
if (argv.help) {
    console.log('carmen.js --query="<query>" [options]');
    console.log('[options]:');
    console.log('  --config=<file.js>      Load index config from js (module)');
    console.log('  --proximity="lat,lng"   Favour results by proximity');
    console.log('  --types="{type},..."    Only return results of a given type');
    console.log('  --geojson               Return a geojson object');
    console.log('  --stats                 Generate Stats on the query');
    console.log('  --debug="feat id"       Follows a feature through geocode"');
    console.log('  --help                  Print this report');
    process.exit(0);
}
}
