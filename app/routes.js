/* global log */
var callbackHandler = require(__dirname + "/lib/api-callback-handler.js");
var apiRoutes = require(__dirname + "/lib/api-routes.js");
var errorConfig = require(__dirname + "/lib/error-messages.js");
var apiHandler = require(__dirname + "/lib/api-handler.js");

module.exports = {
  bind: function (app) {

    // Default
    app.get('/', function (req, res) {
      log.info("GET Request : " + req.url);
      res.redirect('index');
    });

    // START 01-start
    app.post('/01-start/01-start', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('01-start/02-what-would-you-like-to-do');
    });

    app.post('/01-start/02-what-would-you-like-to-do', function (req, res) {
      log.info("POST Request : " + req.url + " : Action : " + action);
      var action = req.param('sub-button');
      req.session.checking_only = (action === "Check the format of my data") ? true : false;
      var url = req.session.checking_only ? '02-check-your-data/01-upload-your-data' : '03-sign-in-register/01-have-account';
      res.redirect(url);
    });
    // END 01-start

    // START 02-check-your-data
    app.post('/02-check-your-data/01-upload-your-data', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('02-check-your-data/01-upload-your-data');
    });

    app.post('/02-check-your-data/04-success', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('01-start/02-what-would-you-like-to-do');
    });
    // END 02-check-your-data

    // START 03-sign-in-register
    app.post('/03-sign-in-register/01-have-account', function (req, res) {
      log.info("POST Request : " + req.url + " : Action : " + action);
      var action = req.param('radio-inline-group');
      var route = (action === "Yes") ? '03-sign-in-register/05-sign-in' : '03-sign-in-register/02-account-details';
      res.redirect(route);
    });

    app.post('/03-sign-in-register/02-account-details', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('03-sign-in-register/03-activate-account');
    });

    app.post('/03-sign-in-register/04-activate-account', function (req, res) {
      log.info("GET Request : " + req.url);
      res.redirect('03-sign-in-register/04-account-activated');
    });

    app.post('/03-sign-in-register/04-account-activated', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('04-send-your-data/01-upload-your-data');
    });

    app.post('/03-sign-in-register/05-sign-in', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('04-send-your-data/01-upload-your-data');
    });
    // END 03-sign-in-register

    // START 04-send-your-data
    app.post('/04-send-your-data/01-upload-your-data', function (req, res) {
      log.info("POST Request : " + req.url);
      res.redirect('04-send-your-data/01-upload-your-data');
    });
    // END 04-send-your-data

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

    // auto render any OTHER view that exists
    app.get(/^\/([^.]+)$/, function (req, res) {

      var path = (req.params[0]);

      res.render(path, function (err, html) {
        if (err) {
          console.log(err);
          res.send(404);
        } else {
          res.end(html);
        }
      });
    });
  }
};
