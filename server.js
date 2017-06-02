"use strict";

const config = require('./app/lib/configuration-handler.js').Configuration;
const winston = require("./app/lib/winston-setup");
const Hapi = require('hapi');
const Hogan = require('hogan.js');
const rimraf = require('rimraf');
const fs = require('fs');
const mkdirp = require('mkdirp');
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
rimraf(config.get('upload.path'), function () {
    mkdirp(config.get('upload.path'), function (err) {
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
let csrf_handler_config = {
    paths: [
        {
            source: new RegExp('/email'),
            target: new RegExp('/email')
        },
        {
            source: new RegExp('/pin'),
            target: new RegExp('/pin')
        }
    ]
};



server.ext('onPreResponse', function (request, reply) {
    /*
     * The content-security-policy is used by modern browsers to
     * prevent XSS attacks.
     *
     * See https://content-security-policy.com/ for details
     *
     * We need to serve up images to anywhere (over https) because
     * the email messages sent to users refer to the images and these
     * maybe requested - for example - from google's servers.
     *
     * IE does not support content-security-policy but has limited support
     * of X-Content-Security-Policy however it is not recommended to mix the depreciated
     * X-headers.
     *
     */
    let contentSecurityPolicy = "default-src 'none'; " +
        "script-src 'self' 'unsafe-inline' www.google-analytics.com www.googletagmanager.com; " +
        "font-src 'self' data:; connect-src 'self'; img-src *; style-src 'self';";

    let resp = request.response;

    if (resp && resp.header) {
        if (!request.path || !request.path.startsWith('/public')) {
            resp.header('cache-control', 'no-store, max-age=0, must-revalidate');
        }

        resp.header('content-security-policy', contentSecurityPolicy);

    }

    // Get the session
    let cookies = new Cookies(request, reply);
    // If we have a new sessionId in this request we cannot get it from the cookie header yet
    let sessionID = request._sessionId || cookies.get(userHandler.DATA_RETURNS_COOKIE_ID);
    // Ignore resource requests - we only need to set the CSRF token on the html views
    if (sessionID && resp.source && csrf_handler_config.paths.map(p => p.source).find(path => path.test(request.path))) {
        // Get the csrf token from the session
        redisKeys.CSRF_TOKEN.compositeKey(sessionID)
            .then(cacheHandler.getJsonValue)
            .then(function (val) {
                if (!val) {
                    winston.warn(`For path: ${request.path} no CSRF token was found in the cache ${sessionID}`);
                } else {
                    winston.debug(`For path: ${request.path} added CSRF token to session ${sessionID}`);
                    // Make sure the source context is defined and set the csrf token on it
                    // so it becomes available in  the views as {{csrf}}
                    resp.source.context = resp.source.context || {};
                    resp.source.context['csrf'] = val;
                }
                reply(resp);
            })
            .catch(function (err) {
                // Log the error and continue
                winston.error(`${request.path} has error: ${err}`);
                reply(resp);
            });
    } else {
        reply(resp);
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
    // Token checker
    if (request.headers && request.method === 'post' && csrf_handler_config.paths.map(p => p.target).find(path => path.test(request.path))) {
        // Get the CSRF token from the session
        // Note that the response state is null as the request payload has not yet been parsed
        // - we therefore need to lift the sessionId directly from the request header
        winston.debug('csrf_check_function:' + request.path);
        let cookies = new Cookies(request);
        let sessionID = cookies.get(userHandler.DATA_RETURNS_COOKIE_ID);
        if (sessionID) {
            redisKeys.CSRF_TOKEN.compositeKey(sessionID)
                .then(cacheHandler.getJsonValue)
                .then(function (val) {
                    winston.info("Retrieved CSRF token");
                    if (request.payload.csrf !== val) {
                        winston.info(`CSRF: token (${request.payload.csrf}) check failure, POST request disallowed path: ${request.path} host: ${request.headers['host']}`);
                        // We have to redirect to forbidden as there is no access to the replay object at this point
                        next.redirect('/forbidden');
                    } else {
                        next.continue();
                    }
                })
                .catch(function (err) {
                    winston.error(err);
                    next.redirect('/failure');
                });
        } else {
            // If there is no session cookie then then redirect to the cookie information page
            next.redirect('/guidance/no-cookie');
        }
    } else {
        // Resume
        next.continue();
    }
};

// Register the event handler for the CSRF
server.ext('onPreHandler', csrf_check_function);

cacheHandler.connectionReady()
    .then(() => {
        // Connection established!

        // Remove the cached list metadata
        cacheHandler.deleteKeys(redisKeys.LIST_METADATA.key)
            .then(winston.info('Deleted old list metadata: '))
            .catch(err => winston.info('Cannot delete old list metadata: ' + err));


        // Start the web server.
        server.start(function (err) {
            if (err) {
                winston.error("Hapi server failed to start: ", err);
                process.exit(1);
            }

            winston.info(`Data-Returns Service: listening on port ${config.get('client.port')}, NODE_ENV: ${process.env.NODE_ENV}`);
        });
    })
    .catch((err) => {
        winston.error("Redis connection failed.  Not starting server.", err);
        process.exit(1);
    });