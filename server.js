var path = require('path');
var express = require('express');
var multer = require('multer');
var routes = require(__dirname + '/app/routes.js');
var app = express();
var RedisStore = require('connect-redis')(express);
var port = (process.env.PORT || 3000);
//    parse = require('csv-parse'),
var fs = require('fs');
var request = require('request');
var qs = require('querystring');
var Logger = require('bunyan'), Stream = require('stream');
// var lineReader = require('line-reader');
// var nodemailer = require('nodemailer');
var result;

// Grab environment variables specified in Procfile or as Heroku config vars
var username = process.env.USERNAME;
var password = process.env.PASSWORD;
var env = process.env.NODE_ENV || 'development';

var stream = new Stream()
stream.writable = true

stream.write = function(obj) {
    // pretty-printing your message
    console.log(obj.msg)
}

// 'orrible but made global to move routing out the way in to routes.js
userId = -1;
done = false;


log = Logger.createLogger({
    name: 'myserver',
    streams: [{
        type: "raw",
        stream: stream,
    }],
    serializers: {
        err: Logger.stdSerializers.err,
        req: Logger.stdSerializers.req,
        res: Logger.stdSerializers.res,
    },
});


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

app.use(express.urlencoded());

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

app.use(express.cookieParser());
app.use(express.session({
    store: new RedisStore({
        host: 'localhost',
        port: 6379,
        db: 2
        //,        pass: 'RedisPASS'
    }),
    secret: '1234567890QWERTY'
}));

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

// routes (found in app/routes.js)
routes.bind(app);

// start the app

app.listen(port);
console.log('');
console.log('Listening on port ' + port);
console.log('');
