const Path = require('path'),
      Hapi = require('hapi'),
      Hogan = require('hogan.js');
      //multer = require('multer'),    // Remove for HAPI

// Grab our environment-specific configuration; by default we assume a development environment.
// TODO: HAPI version of configuration variable.
const config = require('./app/config/config.' + (process.env.NODE_ENV || 'development'));

// Create and initialise the server.
var server = new Hapi.Server();
server.connection({
  host: 'localhost',
  port: config.port
});

// Setup logging.
server.register(
  {
    register: require('good'),
    options: {
      opsInterval: 1000,
      reporters: [
        {
          reporter: require('good-console'),
          events: {log: '*', response: '*'}
        },
        {
          reporter: require('good-file'),
          events: {ops: '*'},
          config: './logs/ops.log'
        }
      ]
    }
  }, function (err) {
    if (err) {
      console.error('Failed to initialise logging components.');
      throw err;
    }
  }
);

// If configured, require the user to provide Basic Authentication details to view
// this site (useful when the site is hosted publicly but still in development).
if (config.requireBasicAuth)
{
  if (!config.basicAuthUsername || !config.basicAuthPassword)
  {
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

// Configure session storage.
// TODO: Is a cookie sufficient?  Do we need to hook into a database?
server.register({
    register: require('yar'),
    options: {
      storeBlank: true,
      name: 'data-returns-session',
      cookieOptions: {
        password: config.sessionStorage.secret
      }
    }
  }, function (err) {
    if (err) {
      console.error('Failed to initialise session storage component.');
      throw err;
    }
  }
);

// HAPI: Remove this.
//Configure multer
/*
 app.use(multer({
   dest                 : './uploads/uploaded/',
   inMemory             : false,
   putSingleFilesInArray: true,
   rename               : function (fieldname, filename) {
     return filename;
   },
    
   onFileUploadStart    : function (file, req, res) {
   console.log('upload of ' + file.originalname + ' is starting ...');
     file.uploadComplete = false;
   },
    
    onFileUploadComplete: function (file, req, res) {
      console.log(file.originalname + ' uploaded.');
      file.uploadComplete = true;
   }
 }));*/

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
  const partialsCache = {};
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
    partialsPath: [
      './app/views/includes',
      './govuk_modules/govuk_template/views/layouts'
    ],
    context: sharedViewContext
  });
});

// Configure server routes.
server.route(require('./app/routes'));

// Start the server.
server.start(function (err) {
  if (err) {
    console.error('Failed to start server.');
    throw err;
  }
  server.log(
    ['info', 'status'],
    'Data Returns Frontend: listening on port ' + config.port.toString()
  );
});
