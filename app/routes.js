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
            var action = req.param('sub-button');

            log.info("POST Request : " + req.url + " : Action : " + action);

            if (action == "Check the format of my data")
            {
                req.session.checking_only = true;
                res.redirect('02-check-your-data/01-upload-your-data');
            }
            else
            {
                req.session.checking_only = false;
                res.redirect('03-sign-in-register/01-have-account');
            }
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
            var action = req.param('radio-inline-group');

            log.info("POST Request : " + req.url + " : Action : " + action);

            if (action == "Yes")
            {
                res.redirect('03-sign-in-register/05-sign-in');
            }
            else
            {
                res.redirect('03-sign-in-register/02-account-details');
            }
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

            // TODO JG set result property(s)
            var result = {
                pageText        : 'There is a problem',
                errMess         : 'Not a CSV File',
                errButtonText   : 'Start again...'
            };

            var sess = req.session;

            if (sess.checking_only)
            {
                // TODO JG set result property(s)
                result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                res.render('error_checking', {result: result});
            }
            else
           {
               // TODO JG set result property(s)
               result.errButtonAction = '/04-send-your-data/01-upload-your-data';
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

                    // Simple validations

                    //Check to see if it's a csv file - caught on select (with js on) so redundant
                    if (thisFile.extension !== 'csv')
                    {
                        res.render("file-upload/there-is-a-problem", {
                            "message"  : "<tr><td>-</td><td>-</td><td>The file isn't in csv format.</td></tr>",
                            "file_name": thisFile.originalname
                        });
                        return;
                    }

                    // TODO Check to see if file contains at least 1 data row

                    var formData = {
                        userId : userId,
                        fileUpload: fs.createReadStream(thisFile.path)
                    };

                    // Pass on file to data exchange
                    request.post({
                        url     : 'http://localhost:9020/file-upload',
                        formData: formData
                    }, function optionalCallback(err, httpResponse, body) {

                        var sess = req.session;

                        if (err)
                        {
                            var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                            // TODO JG set result property(s)
                            var result = {
                                pageText        : 'There is a problem',
                                errMess        : errMess,
                                errButtonText  : 'Start again...'
                            };

                            if (sess.checking_only)
                            {
                                // TODO JG set result property(s)
                                result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                                res.render('error_checking', {result: result});
                            }
                            else
                            {
                                // TODO JG set result property(s)
                                result.errButtonAction = '/04-send-your-data/01-upload-your-data';
                                res.render('error_sending', {result: result});
                            }
                        }
                        else
                        {
                            result = JSON.parse(body);

                            if (result.outcome == "SYSTEM_FAILURE")
                            {
                                // TODO JG set result property(s)
                                result.pageText = 'There is a problem';
                                result.errMess = result.outcomeMessage;
                                result.errButtonText = 'Start again...';

                                if (sess.checking_only)
                                {
                                    // TODO JG set result property(s)
                                    result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                                    res.render('error_checking', {result: result});
                                }
                                else
                                {
                                    // TODO JG set result property(s)
                                    result.errButtonAction = '/04-send-your-data/01-upload-your-data';
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
                                    res.render('02-check-your-data/03-verify-your-file', {result: result});
                                else
                                    res.render('04-send-your-data/03-verify-your-file', {result: result});
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

        app.post('/api/file-upload-validate', function (req, res) {
            log.info("POST Request : " + req.url);

            var request = require('request');
            var sess = req.session;

            var formData = {
                fileKey : sess.fileKey,
                eaId : sess.eaId,
                siteName : sess.siteName,
                returnType : sess.returnType
            };

            // Pass on file to data exchange
            request.post({
                header: 'application/x-www-form-urlencoded',
                url     : 'http://localhost:9020/file-upload-validate',
                form:  formData
            }, function optionalCallback(err, httpResponse, body) {

                var sess = req.session;

                if (err)
                {
                    var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                    // TODO JG set result property(s)
                    var result = {
                        pageText        : 'There is a problem',
                        errMess        : errMess,
                        errButtonText  : 'Start again...'
                    };

                    if (sess.checking_only)
                    {
                        // TODO JG set result property(s)
                        result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                        res.render('error_checking', {result: result});
                    }
                    else
                    {
                        // TODO JG set result property(s)
                        result.errButtonAction = '/04-send-your-data/01-upload-your-data';
                        res.render('error_sending', {result: result});
                    }
                }
                else
                {
                    result = JSON.parse(body);

                    if (result.outcome == "SYSTEM_FAILURE")
                    {
                        // TODO JG set result property(s)
                        result.pageText = 'There is a problem';
                        result.errMess = result.outcomeMessage;
                        result.errButtonText = 'Start again...';

                        if (sess.checking_only)
                        {
                            // TODO JG set result property(s)
                            result.errButtonAction = '/02-check-your-data/01-upload-your-data';
                            res.render('error_checking', {result: result});
                        }
                        else
                        {
                            // TODO JG set result property(s)
                            result.errButtonAction = '/04-send-your-data/01-upload-your-data';
                            res.render('error_sending', {result: result});
                        }
                    }
                    else if (result.outcome == "SUCCESS")
                    {
                        if(sess.checking_only)
                            res.render('02-check-your-data/04-success', {"result": result});
                        else
                            res.render('04-send-your-data/04-success', {"result": result});
                    } else
                    {
                        if(sess.checking_only)
                            res.render('02-check-your-data/05-failure', {"result": result});
                        else
                            res.render('04-send-your-data/05-failure', {result: result});
                    }
                }
            });
        });

        app.post('/api/file-upload-send', function (req, res) {
            log.info("POST Request : " + req.url);

            var emailcc = req.param('email_cc');

            var request = require('request');
            var sess = req.session;

            request.post({
                url : 'http://localhost:9020/file-upload-send',
                form: {fileKey: sess.fileKey, emailcc : emailcc}
            }, function optionalCallback(err, httpResponse, body) {

                if (err)
                {
                    var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                    // TODO JG set result property(s)
                    var result = {
                        pageText        : 'There is a problem',
                        errMess        : errMess,
                        errButtonText  : 'Start again...'
                    };

                    // TODO JG set result property(s)
                    result.errButtonAction = '/04-send-your-data/01-upload-your-data';
                    res.render('error_sending', {result: result});
                }
                else
                {
                    result = JSON.parse(body);

                    if (result.outcome == "SYSTEM_FAILURE")
                    {
                        // TODO JG set result property(s)
                        result.pageText = 'There is a problem';
                        result.errMess = result.outcomeMessage;
                        result.errButtonText = 'Start again...';
                        result.errButtonAction = '/04-send-your-data/01-upload-your-data';

                        res.render('error_sending', {"result": result});
                    }
                    else
                    {
                        res.render('04-send-your-data/07-done', {"result": result});
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
