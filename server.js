"use strict";

const config = require('./app/lib/configuration-handler.js').Configuration;
const winston = require("./app/lib/winston-setup");
const Hapi = require('hapi');
const Hogan = require('hogan.js');
const rimraf = require('rimraf');
const fs = require('fs');
const mkdirp = require('mkdirp');
var utils = require('./app/lib/utils');
const AssetManager = require('./app/assembly/AssetManager');
const TemplateBuilder = require('./app/assembly/TemplateBuilder');
var server = new Hapi.Server();
const Cookies = require('cookies');

const cacheHandler = require('./app/lib/cache-handler');
const redisKeys = require('./app/lib/redis-keys.js');
const userHandler = require('./app/lib/user-handler.js');

// Display banner and startup information
winston.info(fs.readFileSync('app/config/banner.txt', 'utf8'));
winston.info("Starting the Data-Returns Frontend Server.  Environment: " + JSON.stringify(process.env, null, 4));

// Build gov.uk templates and start the asset manager
TemplateBuilder.build();
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
        response: "debug",
        log: "info",
        error: "error",
        request: "debug"
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
            TemplateBuilder.GOV_UK_TEMPLATE_PATH
        ],
        context: require("./app/lib/common-view-data"),
        isCached: config.get('html.cached')
    });
});

// Configure server routes.
server.route(require('./app/routes'));

// Implement the pre-response
// Add security headers and CSRF token to be available in any view
server.ext('onPreResponse', function (request, reply) {

    let resp = request.response;

    if (resp && resp.header) {

        if (!request.path || !request.path.startsWith('/public')) {
            resp.header('cache-control', 'no-store, max-age=0, must-revalidate');
        }

        resp.header('content-security-policy', "font-src *  data:; default-src * 'unsafe-inline'; " +
            "base-uri 'self'; connect-src 'self' localhost www.google-analytics.com " +
            "www.googletagmanager.com dr-dev.envage.co.uk; style-src 'self' 'unsafe-inline';");

        // Get the session
        let cookies = new Cookies(request, reply);

        // If we have a new sessionId in this request we cannot get it from the cookie header yet
        let sessionID = request._sessionId || cookies.get(userHandler.DATA_RETURNS_COOKIE_ID);

        // Ignore resource requests - we only need to set the CSRF token on the views
        if (sessionID && resp.source && !request.path.startsWith('/public')) {

            // Get the csrf token from the session
            cacheHandler.getValue(redisKeys.CSRF_TOKEN.compositeKey(sessionID)).then(function (val) {

                if (!val) {
                    winston.error(`No CSRF token found in session ${sessionID}`);
                    return reply(resp);
                }

                winston.debug(`For ${request.path} added CSRF token to session ${sessionID}`);

                // Make sure the source context is defined and set the csrf token on it
                // so it becomes available in  the views as {{csrf}}
                resp.source.context = resp.source.context || {};
                resp.source.context['csrf'] = val;

                return reply(resp);

            }).catch(function (err) {

                // Log the error and continue
                winston.error(err);
                return reply(resp);
            });

        } else {
            return reply(resp);
        }
    } else {
        return reply(resp);
    }
});

//
// The CSRF token is checked for state changing requests
// These are listed in the token_check array
// The token check is performed before the route handler
// We redirect to the start page failing a token check
// or resume to the route handler for normal route processing
//
var csrf_check_function = function (request, next) {
    var token_check = [
        new RegExp('/email'), new RegExp('/pin')
    ];
    // Token checker
    if (request.headers && token_check.find(path => path.test(request.path)) && request.method === 'post') {
        // Get the CSRF token from the session
        // Note that the response state is null as the request payload has not yet been parsed
        // - we therefore need to lift the sessionId directly from the request header
        winston.debug('csrf_check_function:' + request.path);
        let cookies = new Cookies(request);
        let sessionID = cookies.get(userHandler.DATA_RETURNS_COOKIE_ID);
        if (sessionID) {
            cacheHandler.getValue(redisKeys.CSRF_TOKEN.compositeKey(sessionID)).then(function (val) {
                if (request.payload.csrf !== val) {
                    winston.info(`CSRF: token check failure, POST request disallowed path: ${request.path} host: ${request.headers['host']}`);
                    return next.redirect('/start');
                } else {
                    return next.continue();
                }
            }).catch(function (err) {
                winston.error(err);
                next.redirect('/start');
            });
        }
    } else {
        //
        // Resume
        //
        return next.continue();
    }
};

// Verifying Same-origin with standard Headers
// See https://www.owasp.org/index.php?title=Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet&setlang=en
var same_origin_check_function = function (request, next) {

    // List exclusions by wildcard in this array
    let same_origin_ignore = [
        new RegExp('^/$'),
        new RegExp('^/start$')
    ];

    // List exclusions by hostname or IP address in this array
    let localhosts = [
        new RegExp('.*localhost.*'),
        new RegExp('.*0\.0\.0\.0.*'),
        new RegExp('.*127\.0\.0\.1.*')
    ];

    let url = require('url');

    //
    // Same origin check
    //
    if (request.headers && !same_origin_ignore.find(path => path.test(request.path))) {
        // x-forwarded-host should be set by proxies to
        // preserve the original host where 'host' is
        // populated with the IP of the proxy. It should be in the
        // form hostname:port
        var x_host = request.headers['x-forwarded-host'];
        var first_xhost = x_host ? x_host.split(",")[0] : undefined;
        var host = first_xhost || request.headers['host'];
        var origin = request.headers['origin'] || request.headers['referer'];

        if (localhosts.find(hst => hst.test(host))) {
            // Ignore local host
        } else if (!origin) {
            // OWASP recommends blocking requests for which neither
            // an origin or a referer is set. However there are a set
            // of scenarios in which this system; unexpected navigations
            // start page handlers etc do not set either so we have to ignore
            winston.debug('Origin check: No origin');
            winston.debug('Headers: ' + JSON.stringify(request.headers, null, 4));
        } else {
            if (host) {
                var p_host = host.split(":");
                var p_origin = url.parse(origin);
                // Ignore for localhost because using mailcatcher in the same browser
                // as the service resets the origin
                if (p_origin.hostname != p_host[0] || p_origin.port != p_host[1]) {
                    winston.info('Cross origin request disallowed: ' + p_origin.hostname + ":" + p_origin.port);
                    winston.info('Headers: ' + JSON.stringify(request.headers, null, 4));
                    request.setUrl('/start');
                    request.setMethod('GET');
                    next();
                }
            } else {
                winston.info('Illegal: no host header found');
                winston.info('Headers: ' + JSON.stringify(request.headers, null, 4));
                request.setUrl('/start');
                request.setMethod('GET');
                next();
            }
        }
    }
    //
    // Resume
    //
    return next.continue();
};

// Register the event handler for the CSRF and same origin checks
// at the very start of the request cycle (onRequest)
server.ext('onRequest', same_origin_check_function);
server.ext('onPreHandler', csrf_check_function);

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
cacheHandler.deleteKeys(redisKeys.LIST_METADATA.key)
    .then(winston.info('Deleted old list metadata: '))
    .catch(err => winston.info('Cannot delete old list metadata: ' + err));

// Start the server.
server.start(function (err) {
    if (err) {
        winston.error("Data Returns frontend server failed to start: ", err);
        process.exit(1);
    }
    utils.createUploadDirectory();
    winston.info(`Data-Returns Service: listening on port ${config.get('client.port')}, NODE_ENV: ${process.env.NODE_ENV}`);
});