module.exports = function(argv) {
    switch (argv._[2]) {
        case ('map'):
            console.log('usage: index.js build [--in-network=<FILE.mbtiles>] [--in-address=<FILE.mbtiles>] [--output=<FILE.mbtiles>]');
            console.log('');
            console.log('[options]:');
            console.log('   --in-network=<FILE.mbtiles>');
            console.log('   --in-address=<FILE.mbtiles>');
            console.log('   --output=<FILE.mbtiles>');
            console.log('');
            break;
        default:
            console.log('usage: index.js [--version] <command>');
            console.log('');
            console.log('<command>:');
            console.log('    help   [--help]         Displays this message');
            console.log('    build  [--help]         Create source vector tiles');
            console.log('    map    [--help]         Create interpolation from tiles');
            console.log('');
            console.log('[options]:');
            console.log('    --version, -v           Displays version information');
            console.log('');
            break;
    }
}
