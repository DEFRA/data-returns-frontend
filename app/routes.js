const Path = require('path');

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
        ]
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

        // START Misc
        app.get('/invalid_csv_file', function (req, res) {
            log.info("GET Request : " + req.url);

            var result = {
                pageText        : 'There is a problem',
                message         : 'All data files returned using this service must be in CSV format.',
                errButtonText   : 'Select another file'
            };

            var sess = req.session;

            if (sess.checking_only)
            {
                result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                res.render('error_checking', {result: result});
            }
            else
           {
               result.errButtonAction = '/02-send-your-data/01-upload-your-data';
               res.render('error_sending', {result: result});
            }
        });
        // END Misc

        // START API
        app.post('/api/file-upload', function (req, res) {
            log.info("POST Request : " + req.url);

            var request = require('request');
            var fs = require('fs');

            if (done == true)
            {
                var thisFile;

                for (file in req.files.fileUpload)
                {

                    thisFile = req.files.fileUpload[file];

                    // TODO Could some basic validations here before sending to backend
                    //Check to see if it's a csv file - caught on select (with js on) so redundant
                    // TODO make case-insensitive
                    //if (thisFile.extension !== 'csv')
                    //{
                    //    res.render("file-upload/there-is-a-problem", {
                    //        "message"  : "<tr><td>-</td><td>-</td><td>The file isn't in csv format.</td></tr>",
                    //        "file_name": thisFile.originalname
                    //    });
                    //    return;
                    //}

                    var formData = {
                        fileUpload: fs.createReadStream(thisFile.path)
                    };

                    // Pass on file to data exchange
                    request.post({
                        url     : 'http://localhost:9020/data-exchange/upload',
                        formData: formData
                    }, function optionalCallback(err, httpResponse, body) {

                        var sess = req.session;

                        if (err)
                        {
                            var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                            var result = {
                                pageText        : 'There is a problem',
                                message        : errMess,
                                errButtonText  : 'Start again'
                            };

                            if (sess.checking_only)
                            {
                                result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                                res.render('error_checking', {result: result});
                            }
                            else
                            {
                                result.errButtonAction = '/02-send-your-data/01-upload-your-data';
                                res.render('error_sending', {result: result});
                            }
                        }
                        else
                        {
                            result = JSON.parse(body);

                            if(httpResponse.statusCode != 200)
                            {
                                result.pageText = 'There is a problem';
                                result.errButtonText = 'Start again';

                                if (sess.checking_only)
                                {
                                    result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                                    res.render('error_checking', {result: result});
                                }
                                else
                                {
                                    result.errButtonAction = '/02-send-your-data/01-upload-your-data';
                                    res.render('error_sending', {result: result});
                                }
                            }
                            else
                            {
                                sess.fileKey = result.fileKey;
                                sess.eaId = result.eaId;
                                sess.siteName = result.siteName;
                                sess.returnType = result.returnType;

                                if(sess.checking_only)
                                    res.render('02-check-your-data/02-verify-your-file', {result: result});
                                else
                                    res.render('02-send-your-data/02-verify-your-file', {result: result});
                            }
                        }
                    });
                }
            }
            else
            {
                // Doesn't appear to ever get called, handled anyway just in case
                if(sess.checking_only)
                    res.redirect('02-check-your-data/01-upload-your-data');
                else
                    res.redirect('04-check-your-data/01-upload-your-data');
            }
        });

        app.get('/api/file-upload-validate', function (req, res) {
            log.info("GET Request : " + req.url);

            var request = require('request');
            var sess = req.session;

            var headers = {
                'Content-Type':     'application/x-www-form-urlencoded'
            }

            var data = {
                fileKey : sess.fileKey,
                eaId : sess.eaId,
                siteName : sess.siteName,
                returnType : sess.returnType
            };

            // Pass on file to data exchange
            request.get({
                url     : 'http://localhost:9020/data-exchange/validate',
                headers: headers,
                qs:  data
            }, function optionalCallback(err, httpResponse, body) {

                var sess = req.session;

                if (err)
                {
                    var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                    var result = {
                        pageText        : 'There is a problem',
                        message        : errMess,
                        errButtonText  : 'Start again'
                    };

                    if (sess.checking_only)
                    {
                        result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                        res.render('error_checking', {result: result});
                    }
                    else
                    {
                        result.errButtonAction = '/02-send-your-data/01-upload-your-data';
                        res.render('error_sending', {result: result});
                    }
                }
                else
                {
                    result = JSON.parse(body);

                    if(httpResponse.statusCode != 200)
                    {
                        result.pageText = 'There is a problem';
                        result.errButtonText = 'Start again';

                        if (sess.checking_only)
                        {
                            result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                            res.render('error_checking', {result: result});
                        }
                        else
                        {
                            result.errButtonAction = '/02-send-your-data/01-upload-your-data';
                            res.render('error_sending', {result: result});
                        }
                    }
                    else if (result.appStatusCode == 800)
                    {
                        if(sess.checking_only)
                            res.render('02-check-your-data/03-email', {"result": result});
                        else
                            res.render('02-send-your-data/03-email', {"result": result});
                    } else
                    {
                        if(sess.checking_only)
                            res.render('02-check-your-data/06-failure', {"result": result});
                        else
                            res.render('02-send-your-data/06-failure', {result: result});
                    }
                }
            });
        });

        app.post('/api/file-upload-send', function (req, res) {
            log.info("POST Request : " + req.url);

            var userEmail = req.param('user_email');

            var request = require('request');
            var sess = req.session;

            var headers = {
                'Content-Type':     'application/x-www-form-urlencoded'
            }

            var formData = {
                fileKey : sess.fileKey,
                userEmail : userEmail
            };

            request.post({
                url : 'http://localhost:9020/data-exchange/complete',
                headers: headers,
                formData: formData
            }, function optionalCallback(err, httpResponse, body) {

                if (err)
                {
                    var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                    var result = {
                        pageText        : 'There is a problem',
                        message        : errMess,
                        errButtonText  : 'Start again'
                    };

                    result.errButtonAction = '/02-send-your-data/01-upload-your-data';
                    res.render('error_sending', {result: result});
                }
                else
                {
                    result = JSON.parse(body);

                    if(httpResponse.statusCode != 200)
                    {
                        result.pageText = 'There is a problem';
                        result.errButtonText = 'Start again';
                        result.errButtonAction = '/02-send-your-data/01-upload-your-data';

                        if(!result.message)
                        {
                            result.message = result.errors[0];
                        }

                        res.render('error_sending', {"result": result});
                    }
                    else
                    {
                        res.render('02-send-your-data/07-done', {"result": result});
                    }
                }
            });
        });
        // END API

        // auto render any OTHER view that exists
        app.get(/^\/([^.]+)$/, function (req, res) {

            var path = (req.params[0]);

            res.render(path, function (err, html) {
                if (err)
                {
                    console.log(err);
                    res.send(404);
                }
                else
                {
                    res.end(html);
                }
            });

        });
    }
};
*/