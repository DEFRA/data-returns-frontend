const Path = require('path');

/* global log */
var callbackHandler = require(__dirname + "/lib/api-callback-handler.js");
var apiRoutes = require(__dirname + "/lib/api-routes.js");
var errorConfig = require(__dirname + "/lib/error-messages.js");
var apiHandler = require(__dirname + "/lib/api-handler.js");

const redirectToIndexHandler = function(request, reply) {
  return reply.redirect('index');
};

const basicTemplateHandler = function(request, reply) {
  return reply.view(request.path.substring(1));
};

module.exports = [
  // Static assets.
  {
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: [
          'public/',
          'govuk_modules/govuk_template/assets',
          'govuk_modules/govuk_frontend_toolkit'
        ],
        etagMethod: 'hash' // Allows assets to be cached by the client.
      }
    }
  },
  
  // Redirect for site root.
  {
    method: 'GET',
    path: '/',
    handler: redirectToIndexHandler
  },
  
  // "API".
  // TODO: Hook up these routes to proper handlers that implement application
  // logic.
  {
    method: 'POST',
    path: '/api/file-upload',
    handler: function (request, reply) {
      reply.redirect('/02-send-your-data/02-verify-your-file');
    }
  },
  {
    method: 'GET',
    path: '/api/file-upload-validate',
    handler: function (request, reply) {
      reply.redirect('/02-send-your-data/03-email');
    }
  },
  
  // POST handlers.
  // TODO: Hook up these routes to proper handlers that implement application
  // logic.
  {
    method: 'POST',
    path: '/01-start/01-start',
    handler: function (request, reply) {
      reply.redirect('/02-send-your-data/01-upload-your-data');
    }
  },
  
  // GET handlers.
  // TODO: Hook up these routes to proper handlers that implement application
  // logic.
  {
    method: 'GET',
    path: '/index',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/01-start/01-start',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/01-upload-your-data',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/02-verify-your-file',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/03-email',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/04-authenticate',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/05-success',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/06-failure',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/07-failure',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/08-done',
    handler: basicTemplateHandler
  },
  {
    method: 'GET',
    path: '/05-help/01-help',
    handler: basicTemplateHandler
  },
];

/*
    // TODO: All of the old routes which contained any logic are found below.
    // This code needs to be migrated to new handlers.

    app.post('/01-start/02-what-would-you-like-to-do', function (req, res) {
      log.info("POST Request : " + req.url + " : Action : " + action);
      var action = req.param('sub-button');
      req.session.checking_only = (action === "Check the format of my data") ? true : false;
      var url = req.session.checking_only ? '02-check-your-data/01-upload-your-data' : '03-sign-in-register/01-have-account';
      res.redirect(url);
    });
    // END 01-start

    // START 03-sign-in-register
    app.post('/03-sign-in-register/01-have-account', function (req, res) {
      log.info("POST Request : " + req.url + " : Action : " + action);
      var action = req.param('radio-inline-group');
      var route = (action === "Yes") ? '03-sign-in-register/05-sign-in' : '03-sign-in-register/02-account-details';
      res.redirect(route);
    });

    // START Misc
    app.get('/invalid_csv_file', function (req, res) {
      log.info("GET Request : " + req.url);

      var sess = req.session;

      var result = {
        pageText: errorConfig.API.ERRORPAGETEXT,
        message: errorConfig.API.NOT_CSV,
        errButtonText: errorConfig.API.SELECTANOTHERFILE,
        errButtonAction: sess.checking_only ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data'
      };

      var route = sess.checking_only ? apiRoutes.routing.ERRORCHECKING : apiRoutes.routing.ERRORSENDING;

      res.render(route, {result: result});

    });
    // END Misc

    // START API
    app.post('/api/file-upload', function (req, res) {
      log.info("POST Request : " + req.url);

      var request = require('request');
      var sess = req.session;
      var isCheckingOnly = sess.checking_only ? true : false;

      var files = req.files.fileUpload;

      apiHandler.processUploadedFiles(request, files, isCheckingOnly, function (err, data) {

        if (err) {
          console.log(err);
        }

        var result = data.result;

        if (result.fileKey) {//[NeilH] might be a better way with HAPI?
          sess.fileKey = result.fileKey;
          sess.eaId = result.eaId;
          sess.siteName = result.siteName;
          sess.returnType = result.returnType;
        }

        res.render(data.route, {"result": data.result});

      });
      
    });

    app.get('/api/file-upload-validate', function (req, res) {
      log.info("GET Request : " + req.url);

      var request = require('request');
      var sess = req.session;

      var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      var data = {
        fileKey: sess.fileKey,
        eaId: sess.eaId,
        siteName: sess.siteName,
        returnType: sess.returnType
      };

      var url = apiRoutes.routing.FILEUPLOADVALIDATE;
      // Pass on file to data exchange
      request.get({
        url: url,
        headers: headers,
        qs: data
      }, function (err, httpResponse, body) {

        var stage = 'validate';
        var responseCode = httpResponse.statusCode;
        var sess = req.session;
        var isCheckingOnly = sess.checking_only ? true : false;

        callbackHandler.processCallback(stage, isCheckingOnly, err, responseCode, body, function (data) {
          res.render(data.route, {"result": data.result});
        });
      });
    });

    app.post('/api/file-upload-send', function (req, res) {
      log.info("POST Request : " + req.url);

      var userEmail = req.param('user_email');
      var request = require('request');
      var sess = req.session;

      var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      var formData = {
        fileKey: sess.fileKey,
        userEmail: userEmail
      };

      request.post({
        url: apiRoutes.routing.FILEUPLOADSEND,
        headers: headers,
        formData: formData
      }, function (err, httpResponse, body) {

        var stage = 'complete';
        var responseCode = httpResponse.statusCode;
        var sess = req.session;
        var isCheckingOnly = sess.checking_only ? true : false;

        callbackHandler.processCallback(stage, isCheckingOnly, err, responseCode, body, function (data) {
          res.render(data.route, {"result": data.result});
        });
      });
    });
    // END API
};
*/