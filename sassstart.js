var fs = require('fs'),
    pidFile = __dirname + '/.start.pid',
    fileOptions = { encoding : 'utf-8' };

// Start Grunt, which will in turn launch a Node instance that runs server.js.
require(__dirname + '/node_modules/grunt/lib/grunt.js').cli({
    'gruntfile': __dirname + '/Gruntfile.js'
});

// Write our process ID to a file to later reference.
fs.writeFileSync(pidFile, process.pid, fileOptions);

// Abort if we receive a signal.
process.on('SIGINT', function() {
    var pid = fs.readFileSync(pidFile, fileOptions);

    fs.unlink(pidFile);
    process.kill(pid, 'SIGTERM');
    process.exit();
});
