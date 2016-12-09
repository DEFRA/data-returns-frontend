"use strict";

const config = require('./app/lib/configuration-handler.js').Configuration;
const winston = require("./app/lib/winston-setup");
const Hapi = require('hapi');
const Crumb = require('crumb');
const Hogan = require('hogan.js');
const rimraf = require('rimraf');
const fs = require('fs');
const mkdirp = require('mkdirp');
var utils = require('./app/lib/utils');
const AssetManager = require('./app/lib/AssetManager');
var server = new Hapi.Server();
const cacheHandler = require('./app/lib/cache-handler');
const redisKeys = require('./app/lib/redis-keys.js');

// Display banner and startup information
winston.info(fs.readFileSync('app/config/banner.txt', 'utf8'));
winston.info("Starting the Data-Returns Frontend Server.  Environment: " + JSON.stringify(process.env, null, 4));

// Start the asset manager
AssetManager.start();

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
        "cors": false,  // Disallow CORS - There is no requirement to allow cross origin requests in data returns.
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
        throw err;
    }
    server.views({
        engines: {
            html: {
                compile: function (template, info) {
                    winston.info(`Compiling template ${info.filename}`);
                    try {
                        var compiledTemplate = Hogan.compile(template);
                        return function (context) {
                            try {
                                return compiledTemplate.render(context, partialsCache);
                            } catch (e) {
                                winston.error(`Failed to render template for ${info.filename}: ${e.message}`, e);
                                throw e;
                            }
                        };
                    } catch (e) {
                        winston.error(`Failed to compile template for ${info.filename}: ${e.message}`, e);
                        throw e;
                    }

                },
                registerPartial: function (name, template) {
                    // There is a bug in Hogan.js that caus es compiled partials to cache
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

// Setup Crumb - double submit cookie for all post requests
// below is an array of regular expressions containing the exclusions as
// We cannot use the check with the fine uploader because the
// XMLHttpRequest leaks the tokens.
var csrf_check_skip = [
    new RegExp('/file/choose'),
    new RegExp('/public/.*')
];

// Register the crumb plugin which creates a csrf token
// which is used to validate POST returns are not from domains
// other than the primary domain
server.register({
    register: Crumb,
    options: {
        skip: function (request) {
            if (csrf_check_skip.find(route => route.test(request.path))) {
                return true;
            }
            return false;
        },
        cookieOptions: {
            ttl: 1000 * 60 * 60 * 24 // The crumb cookie life is 24 hours after which a new one is automatically generated.
        },
    }
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

// Verifying Same-origin with standard Headers
// See https://www.owasp.org/index.php?title=Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet&setlang=en
// Which suggests origin checking in addition to the Double Submit Cookie pattern
// Exclude the start page which can land
var same_origin_ignore = [
    new RegExp('^/$'),
    new RegExp('^/start$')
];
// Register the event handler
server.ext('onRequest', function (request, reply) {
    var url = require('url');
    if (request.headers && !same_origin_ignore.find(path => path.test(request.path))) {
        // x-forwarded-host should be set by proxies to
        // preserve the original host where 'host' is
        // populated with the IP of the proxy. It should be in the
        // form hostname:port
        var x_host = request.headers['x-forwarded-host'];
        var first_xhost = x_host ? x_host.split(",")[0] : undefined;
        var host = first_xhost || request.headers['host'];
        var origin = request.headers['origin'] || request.headers['referer'];

        if (!origin) {
            // OWASP recommends blocking requests for which neither
            // an origin or a referer is set. However there are a set
            // of scenarios in which this system; unexpected navigations
            // start page handlers etc do not set either so we have to ignore
        } else {
            if (host) {
                var p_host = host.split(":");
                var p_origin = url.parse(origin);
                if (p_origin.hostname != p_host[0] || p_origin.port != p_host[1]) {

                    var errmsg = 'onRequest[path]: ' + request.path + '\n' +
                        'onRequest[method]: ' + request.method + '\n' +
                        'Header[x-forwarded-host]: ' + x_host + '\n' +
                        'Header[host]: ' + host + '\n' +
                        'Header[x-forwarded-host]: ' + x_host + '\n' +
                        'Header[origin]: ' + request.headers['origin'] + '\n' +
                        'Header[referer]: ' + request.headers['referer'];

                    winston.info('Cross origin request disallowed: ' + p_origin.hostname + ":" + p_origin.port);
                    winston.info('Cross origin request details: ' + errmsg);

                    request.setUrl('/start');
                    reply.redirect();
                }
            } else {
                winston.info('Illegal: no host header found');
                request.setUrl('/start');
                reply.redirect();
            }
        }
    }
    return reply.continue();
});

//lint js files
var exec = require('child_process').exec;
function forEachLine(content, lineCallback) {
    for (let line of content.split("\n")) {
        lineCallback(line);
    }
}

if (config.get('startup.runLinter')) {
    exec(__dirname + '/node_modules/eslint/bin/eslint.js app/** test/** -f tap', function (error, stdout) {
        winston.info('Checking javascript files ');
        forEachLine(stdout, winston.info);
        if (error) {
            forEachLine(error.message, winston.warn)
        }
    });
}

if (config.get('startup.runUnitTests')) {
    exec('lab -e ' + process.env.NODE_ENV + ' -r console -o stdout -r html -o reports/data-returns-front-end-test-results.html', function (error, stdout) {
        winston.info('Running Unit Tests:');
        forEachLine(stdout, winston.info);
        if (error) {
            forEachLine(error.message, winston.warn);
        }
    });
}

// Remove the cached list metadata
cacheHandler.deleteKeys(redisKeys.LIST_METADATA.key);

// Start the server.
server.start(function (err) {
    if (err) {
        winston.error("Data Returns frontend server failed to start: ", err);
        process.exit(1);
    }
    utils.createUploadDirectory();
    winston.info(`Data-Returns Service: listening on port ${config.get('client.port')}, NODE_ENV: ${process.env.NODE_ENV}`);
});