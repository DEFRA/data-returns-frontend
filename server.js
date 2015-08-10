var path = require('path');
var express = require('express');
var multer = require('multer');
var routes = require(__dirname + '/app/routes.js');
var app = express();
var port = (process.env.PORT || 3000);
var done = false;
//    parse = require('csv-parse'),
var fs = require('fs');
var request = require('request');
// var lineReader = require('line-reader');
// var nodemailer = require('nodemailer');
var result;

// Grab environment variables specified in Procfile or as Heroku config vars
var username = process.env.USERNAME;
var password = process.env.PASSWORD;
var env = process.env.NODE_ENV || 'development';

// Authenticate against the environment-provided credentials, if running
// the app in production (Heroku, effectively)
if (env === 'production')
{
    if (!username || !password)
    {
        console.log('Username or password is not set, exiting.');
        process.exit(1);
    }
    app.use(express.basicAuth(username, password));
}

//Configure multer
app.use(multer({
    dest                 : './uploads/uploaded/',
    inMemory             : false,
    putSingleFilesInArray: true,
    rename               : function (fieldname, filename) {
        return filename;
    },
    onFileUploadStart    : function (file, req, res) {
        console.log('upload of ' + file.originalname + ' is starting ...');
    },
    onFileUploadComplete : function (file) {
        console.log(file.originalname + ' uploaded.');
        done = true;
    }
}));

// Application settings
app.engine('html', require(__dirname + '/lib/template-engine.js').__express);
app.set('view engine', 'html');
app.set('vendorViews', __dirname + '/govuk_modules/govuk_template/views/layouts');
app.set('views', __dirname + '/app/views');

// Middleware to serve static assets
app.use('/public', express.static(__dirname + '/public'));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_template/assets'));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_frontend_toolkit'));

app.use(express.favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images', 'favicon.ico')));

// send assetPath to all views
app.use(function (req, res, next) {
    res.locals({'assetPath': '/public/'});
    next();
});

app.get('/file-upload/send', function (req, res) {

    request.post({
        url : 'http://localhost:9020/file-upload-send',
        form: {key: result.key}
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

// routes (found in app/routes.js)

routes.bind(app);

// auto render any view that exists
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


//file upload route
app.post('/api/file-upload', function (req, res) {
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
                fileUpload: fs.createReadStream(thisFile.path)
            };

            // Pass on file to data exchange
            request.post({
                url     : 'http://localhost:9020/file-upload',
                formData: formData
            }, function optionalCallback(err, httpResponse, body) {
                if (err)
                {
                    res.render("file-upload/error", {"error": err.message});
                }
                else
                {
                    result = JSON.parse(body);

                    if (result.errors.length > 0)
                    {
                        res.render("file-upload/there-is-a-problem", {"result": result});
                    }
                    else
                    {
                        res.render("file-upload/check-report", {"file_name": thisFile.originalname});
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

// start the app

app.listen(port);
console.log('');
console.log('Listening on port ' + port);
console.log('');
