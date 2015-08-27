module.exports = {
    bind: function (app) {

        app.get('/', function (req, res) {
            res.render('index');
        });

        app.get('/01-start', function (req, res) {
            res.render('01-start/01-start');
        });
        app.post('/01-start', function (req, res) {
            res.render('01-start/02-what-would-you-like-to-do');
        });

        app.get('/01-upload-your-data', function (req, res) {
            res.render('02-check-your-data/01-upload-your-data');
        });

        app.post('/02-what-would-you-like-to-do', function (req, res) {
            var action = req.param('sub-button');

            if (action == "Check the format of my data")
            {
                res.render('02-check-your-data/01-upload-your-data');
            }
            else
            {
                res.render('03-sign-in-register/01-have-account');
            }
        });

        app.post('/01-have-account', function (req, res) {
            var action = req.param('radio-inline-group');

            if (action == "Yes")
            {
                res.render('03-sign-in-register/05-sign-in.html');
            }
            else
            {
                res.render('03-sign-in-register/02-account-details.html');
            }
        });

        //app.get('/api/login', function (req, res) {
        //    var email = req.param('email', "user2@test.com");
        //console.log(email);
        //    if(email == "user1@test.com")
        //        userId = 1;
        //    else
        //        userId = 2;
        //
        //    res.render('file-upload/index');
        //});

        app.post('/api/file-upload', function (req, res) {

            var request = require('request');
            var fs = require('fs');

            if (done == true)
            {
                var thisFile;

                for (file in req.files.fileUpload)
                {

                    thisFile = req.files.fileUpload[file];

                    // Simple validations

                    //Check to see if it's a csv file
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

                        if (err)
                        {
                            var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                            res.render('error', {errMess:  errMess});
                        }
                        else
                        {
                            result = JSON.parse(body);

                            if (result.outcome == "SYSTEM_FAILURE")
                            {
                                res.render('error', {errMess:  result.outcomeMessage});
                            }
                            else
                            {
                                res.render('02-check-your-data/03-verify-your-file', {result: result});
                            }
                        }
                    });
                }
            }
            else
            {
                res.render("file-upload/browse");
            }
        });

        app.post('/api/file-upload-validate', function (req, res) {

            var request = require('request');

            var formData = {
                fileKey : req.body.fileKey,
                eaId : req.body.eaId,
                siteName : req.body.siteName,
                returnType : req.body.returnType
            };

            // Pass on file to data exchange
            request.post({
                header: 'application/x-www-form-urlencoded',
                url     : 'http://localhost:9020/file-upload-validate',
                form:  formData
            }, function optionalCallback(err, httpResponse, body) {
                if (err)
                {
                    var errMess = (err.code == "ECONNREFUSED" ? "The Data Exchange Service is not available" : "Unknown Error");
                    res.render('error', {errMess:  errMess});
                }
                else
                {
                    result = JSON.parse(body);

                    if (result.outcome == "SYSTEM_FAILURE")
                    {
                        res.render('error', {errMess:  result.outcomeMessage});
                    }
                    else if (result.outcome == "SUCCESS")
                    {
                        res.render('02-check-your-data/04-success', {"result": result});
                    } else
                    {
                        res.render('02-check-your-data/05-failure', {"result": result});
                    }
                }
            });
        });

        app.get('/file-upload/send', function (req, res) {

            var request = require('request');

            request.post({
                url : 'http://localhost:9020/file-upload-send',
                form: {fileKey: result.fileKey}
            }, function optionalCallback(err, httpResponse, body) {

                if (err)
                {
                    res.render("file-upload/error", {"error": err.message});
                }
                else
                {
                    result =
                        JSON.parse(body);

                    res.render('file-upload/sent', {'mailOptions': result.message});
                }
            });
        });

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
