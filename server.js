var Path = require('path');
var Hapi = require('hapi');
var Hogan = require('hogan.js');
var userHandler = require('./app/lib/user-handler');
// Grab our environment-specific configuration; by default we assume a local dev environment.
var config = require('./app/config/configuration_' + (process.env.NODE_ENV || 'local'));
// Create and initialise the server.
var utils = require('./app/lib/utils');

var server = new Hapi.Server();

server.connection({
  host: '0.0.0.0',
  port: config.http.port,
  routes: {cors: true}
});

// Setup logging.
server.register({
  register: require('good'),
  options: {
    opsInterval: 1000,
    reporters: [
      {
        reporter: require('good-console'),
        events: {
          log: '*',
          error: '*'
            //response: config.log.responses === true ? '*' : 'none'
        }
      },
      {
        reporter: require('good-file'),
        events: {
          log: '*',
          //request: '*',
          //response: '*',
          error: '*'
        },
        config: {
          path: './logs',
          prefix: 'DataReturnsApp',
          format: 'DD-MMM-YYYY',
          rotate: 'daily',
          extension: '.log'
        }
      }
    ]
  }
}, function (err) {
  if (err) {
    console.error('Failed to initialise logging components.');
    throw err;
  }
});
// If configured, require the user to provide Basic Authentication details to view
// this site (useful when the site is hosted publicly but still in development).
if (config.requireBasicAuth) {
  if (!config.basicAuthUsername || !config.basicAuthPassword) {
    console.error('Basic Authentication username or password is not set; exiting.');
    process.exit(1);
  }

  // TODO: Implement a basic user database, so we can grant temporary access
  // to individual testers.
  server.register(require('hapi-auth-basic'), function (err) {
    if (err) {
      console.error('Failed to initialise authorisation component.');
      throw err;
    }
    server.auth.strategy('simple', 'basic', 'required', {
      validateFunc: function (request, username, password, callback) {
        callback(null, (username === config.basicAuthUsername) && (password === config.basicAuthPassword));
      }
    });
  });
}

server.register({
  register: require('yar'),
  options: {
    storeBlank: true,
    name: 'data-returns-session',
    cookieOptions: {
      isSecure: false, //config.env === 'local' ? false : true,
      isHttpOnly: true, // not accessable from javascript
      password: config.sessionStorage.secret
    }
  },
  maxCookieSize: 350
}, function (err) {
  if (err) {
    console.error('Failed to initialise session storage component.');
    throw err;
  }
});
// Setup serving of static assets.
server.register(require('inert'), function (err) {
  if (err) {
    console.error('Failed to initialise static file server component.');
    throw err;
  }
});
// Setup context we want to pass to all views.
var sharedViewContext = {
  'assetPath': '/public/',
  // Copy any required fields from the config variable, so that we don't expose this directly
  // to the views (it contains data we don't want to accidentally expose).
  analytics: {
    useGoogleAnalytics: config.useGoogleAnalytics,
    googleTagManagerId: config.googleTagManagerId
  }
};
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
      './govuk_modules/govuk_template/views/layouts'
    ],
    context: sharedViewContext
  });
});
// Configure server routes.
server.route(require('./app/routes'));

server.ext('onRequest', function (request, reply) {

  //if the user tries to start somewhere other than the start page redirect them there
  //var isIndexPage = (request.path.search('/index/') === -1) ? false : true;
  var isAnInclude = (request.path.search('/public/') === -1) ? false : true;
  var startPage = '/01-start/01-start';
  var isStartPage = (request.path.search(startPage) === -1) ? false : true;
  var isGetMethod = (request.method === 'get') ? true : false;
  var hasReferrer = (request.info && request.info.referrer) ? true : false;

  //console.log(request.path, 'include:', isAnInclude, 'start page:', isStartPage, 'get method:', isGetMethod, 'referred', hasReferrer);

  // Redirect to the start page if users try and start at any other url
  if (isGetMethod && !hasReferrer && !isAnInclude && !isStartPage) {
    return reply.redirect(startPage);
  } else {
    reply.continue();
  }

});

// add security headers
server.ext('onPreResponse', function (request, reply) {

  var resp = request.response;

  if (resp && resp.header) {
    resp.header('X-Frame-Options', 'sameorigin');
    resp.header('X-XSS-Protection', '1; mode=block');
    resp.header('X-Content-Type-Options', 'nosniff');
    resp.header('cache-control', 'no-store, max-age=0, must-revalidate');
    resp.header('content-security-policy', "font-src *  data:; default-src * 'unsafe-inline'; base-uri 'self'; connect-src 'self' localhost www.google-analytics.com www.googletagmanager.com dr-dev.envage.co.uk; style-src 'self' 'unsafe-inline';");
  }

  return reply(resp);
});

// Start the server.
server.start(function (err) {

  utils.createUploadDirectory();

  if (err) {
    console.error('Failed to start server.');
    throw err;
  }
  server.log(
    ['info', 'status'],
    'Data Returns Frontend: listening on port ' + config.http.port.toString() + ' , NODE_ENV: ' + process.env.NODE_ENV
    );

});
