"use strict";
const Hapi = require('hapi');
const Hogan = require('hogan.js');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const errbit = require("./app/lib/errbit-handler");
// Grab our environment-specific configuration; by default we assume a local dev environment.
var config = require('./app/config/configuration_' + (process.env.NODE_ENV || 'local'));
// Create and initialise the server.
var utils = require('./app/lib/utils');
const Compressor = require('node-minify');
var SASSHandler = require('./app/lib/SASSHandler');
var server = new Hapi.Server();

console.log("Server starting.  Environment: " + JSON.stringify(process.env));

// Register the hapi server with the errbit handler
errbit.registerHapi(server);

//listen to SASS changes !
SASSHandler.startSASSWatch(__dirname + '/assets/sass');
console.log('Starting the Data-Returns Service');
// Test for cryptography support
try {
    require('crypto');
} catch (err) {
    console.log('Cryptography support is disabled!');
    throw err;
}

// Remove and recreate upload dir
console.log(`Removing old upload folder ${config.upload.path}`);
rimraf(config.upload.path, function() {
    mkdirp(config.upload.path, function(err) {
       console.log(err);
    });
});

server.connection({
    "host": '0.0.0.0',
    "port": config.http.port,
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

// Setup logging.
server.register({
    register: require('good'),
    options: {
        ops: {
            interval: 1000
        },
        reporters: {
            console: [
                {
                    module: 'good-squeeze',
                    name: 'Squeeze',
                    args: [{ log: '*', response: '*' }]
                },
                {
                    module: 'good-console'
                }, 'stdout'
            ],
            file: [
                {
                    module: 'good-squeeze',
                    name: 'Squeeze',
                    args: [{ ops: '*' }]
                },
                {
                    module: 'good-squeeze',
                    name: 'SafeJson'
                },
                {
                    module: 'good-file',
                    args: ['./logs/datareturns.log']
                }
            ],
        }
    }
}, (err) => {
    if (err) {
        throw(err);
    }
});

// If configured, require the user to provide Basic Authentication details to view
// this site (useful when the site is hosted publicly but still in development).
if (config.requireBasicAuth) {
    if (!config.basicAuthUsername || !config.basicAuthPassword) {
        console.log('Basic Authentication username or password is not set; exiting.');
        process.exit(1);
    }

// TODO: Implement a basic user database, so we can grant temporary access
// to individual testers.
    server.register(require('hapi-auth-basic'), function (err) {
        if (err) {
            throw err;
        }
        server.auth.strategy('simple', 'basic', 'required', {
            validateFunc: function (request, username, password, callback) {
                callback(null, (username === config.basicAuthUsername) && (password === config.basicAuthPassword));
            }
        });
    });
}

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
        isCached: config.html.cached
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

    // Payload content length greater than maximum allowed
    if (request.response.isBoom) {
        var err = request.response;
        var errorMessage = err.output.payload.message;
        console.error('Boom Error', err);
        errbit.notify((errorMessage || err));
    }
    return reply(resp);
});


//lint js files
var exec = require('child_process').exec;

exec(__dirname + '/node_modules/eslint/bin/eslint.js app/** test/** -f tap', function (error, stdout) {
    console.log('Checking javascript files ');
    console.log(stdout);
});
exec('lab -e ' + process.env.NODE_ENV + ' -r console -o stdout -r html -o reports/data-returns-front-end-test-results.html', function (error, stdout) {
    console.log('Running Unit Tests: ' + stdout);
    if (error) {
        console.error(error);
    }
});

// Start the server.
server.start(function (err) {
    if (err) {
        throw err;
    }

    utils.createUploadDirectory();
    console.log('==> Minifying and combining Javascript files');
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
    console.log('Data-Returns Service: listening on port ' + config.http.port.toString() + ' , NODE_ENV: ' + process.env.NODE_ENV);
});