"use strict";

const config = require('./app/lib/configuration-handler.js').Configuration;
const winston = require("./app/lib/winston-setup");
const Hapi = require('hapi');
const Hogan = require('hogan.js');
const rimraf = require('rimraf');
const fs = require('fs');
const mkdirp = require('mkdirp');
const merge = require('merge');
var utils = require('./app/lib/utils');
const Compressor = require('node-minify');
var SASSHandler = require('./app/lib/SASSHandler');
var server = new Hapi.Server();
const cacheHandler = require('./app/lib/cache-handler');
const redisKeys = require('./app/lib/redis-keys.js');

// Display banner and startup information
winston.info(fs.readFileSync('app/config/banner.txt', 'utf8'));
winston.info("Starting the Data-Returns Frontend Server.  Environment: " + JSON.stringify(process.env, null, 4));

//listen to SASS changes !

SASSHandler.startSASSWatch(__dirname + '/assets/sass');

// Test for cryptography support
try {
    require('crypto');
} catch (err) {
    winston.info('Cryptography support is disabled!');
    throw err;
}

// Remove and recreate upload dir
winston.info(`Removing old upload folder ${config.get('upload.path')}`);
rimraf(config.get('upload.path'), function() {
    mkdirp(config.get('upload.path'), function(err) {
       winston.info(err);
    });
});

server.connection({
    "host": '0.0.0.0',
    "port": config.get('client.port'),
    "routes": {
        "cors": true,
        "security": {
            // Set the 'Strict-Transport-Security' header
            "hsts": true,
            // Set the X-Frame-Options: sameorigin header
            "xframe": {
                "rule": "sameorigin"
            },
            // TODO: xss: true is the default but we may need to make this false due to IE8 and prior security vulnerability - see http://hapijs.com/api/6.2.0#server-options
            "xss": true,
            "noSniff": true
        }
    }
});

const goodWinstonOptions = {
    levels: {
        ops: "debug",
        response: "info",
        log: "info",
        error: "error",
        request: "info"
    }
};

// Setup logging.
server.register({
    register: require("good"),
    options: {
        ops: {
            interval: 60000
        },
        reporters: {
            winston: [{
                module: "hapi-good-winston",
                name: "goodWinston",
                args: [winston, goodWinstonOptions],
            }]
        }
    }
}, (err) => {
    if (err) {
        throw(err);
    }
});

// Setup serving of static assets.
server.register(require('inert'), function (err) {
    if (err) {
        console.error('Failed to initialise static file server component.');
        throw err;
    }
});

// Setup serving of dynamic views.
server.register(require('vision'), function (err) {
    var partialsCache = {};
    if (err) {
        console.error('Failed to initialise views component.');
        throw err;
    }
    server.views({
        engines: {
            html: {
                compile: function (template) {
                    var compiledTemplate = Hogan.compile(template);
                    return function (context) {
                        return compiledTemplate.render(context, partialsCache);
                    };
                },
                registerPartial: function (name, template) {
                    // There is a bug in Hogan.js that causes compiled partials to cache
                    // rendered versions of their children.  See:
                    // https://github.com/twitter/hogan.js/issues/206
                    // For this reason, we currently cache only the source of each
                    // partial, rather than its compiled version.
                    partialsCache[name] = template;
                }
            }
        },
        relativeTo: __dirname,
        path: 'app/views',
        allowAbsolutePaths: true,
        allowInsecureAccess: false,
        partialsPath: [
            './app/views/includes',
            './app/views/data-returns/includes',
            './govuk_modules/govuk_template/views/layouts'
        ],
        context: require("./app/lib/common-view-data"),
        isCached: config.get('html.cached')
    });
});

// Configure server routes.
server.route(require('./app/routes'));
// add security headers
server.ext('onPreResponse', function (request, reply) {
    var resp = request.response;
    if (resp && resp.header) {
        resp.header('cache-control', 'no-store, max-age=0, must-revalidate');
        resp.header('content-security-policy', "font-src *  data:; default-src * 'unsafe-inline'; base-uri 'self'; connect-src 'self' localhost www.google-analytics.com www.googletagmanager.com dr-dev.envage.co.uk; style-src 'self' 'unsafe-inline';");
    }
    return reply(resp);
});


//lint js files
var exec = require('child_process').exec;

if (config.get('startup.runLinter')) {
    exec(__dirname + '/node_modules/eslint/bin/eslint.js app/** test/** -f tap', function (error, stdout) {
        winston.info('Checking javascript files ');
        for (let line of stdout.split("\n")) {
            winston.info(line);
        }
        if (error) {
            winston.error(error);
        }
    });
}

if (config.get('startup.runUnitTests')) {
    exec('lab -e ' + process.env.NODE_ENV + ' -r console -o stdout -r html -o reports/data-returns-front-end-test-results.html', function (error, stdout) {
        winston.info('Running Unit Tests:');
        for (let line of stdout.split("\n")) {
            winston.info(line);
        }
        if (error) {
            winston.error(error);
        }
    });
}

// Remove the cached list metadata
cacheHandler.deleteKeys(redisKeys.LIST_METADATA.key);

// Start the server.
server.start(function (err) {
    if (err) {
        throw err;
    }

    utils.createUploadDirectory();
    winston.info('==> Minifying and combining Javascript files');
    var jsFileMapping = [
        {
            "in": "assets/javascripts/fine-uploader/fine-uploader.js",
            "out": "public/javascripts/fine-uploader/fine-uploader.js"
        },
        {
            "in": "assets/javascripts/jquery-1.12.4.js",
            "out": "public/javascripts/jquery-1.12.4.js"
        },
        {
            "in": "assets/javascripts/google-analytics.js",
            "out": "public/javascripts/google-analytics.js"
        },
        {
            "in": "assets/javascripts/details.polyfill.js",
            "out": "public/javascripts/details.polyfill.js"
        },
    ];

    for (let mapping of jsFileMapping) {
        // Using UglifyJS for JS
        new Compressor.minify({
            type: 'uglifyjs',
            fileIn: mapping.in,
            fileOut: mapping.out,
            callback: function (err, min) {
                if (err) {
                    throw err;
                }
            }
        });
    }
    winston.info(`Data-Returns Service: listening on port ${config.get('http.port')}, NODE_ENV: ${process.env.NODE_ENV}`);
});