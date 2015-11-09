var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    multer = require('multer'),
    routes = require(__dirname + '/app/routes.js'),
    Logger = require('bunyan'),
    Stream = require('stream');
var app = express();
var redis = null;  // Don't "require" it until we know we need it.

// Grab our environment-specific configuration; by default we assume a development environment.
var config = require('./app/config/config.' + (process.env.NODE_ENV || 'development'));

// Setup logging.
var stream = new Stream();
stream.writable = true;

stream.write = function(obj) {
    // pretty-printing your message
    console.log(obj.msg)
};

// TODO: Understand what purpose this *really* serves, if any?
// 'orrible but made global to move routing out the way in to routes.js
done = false;

log = Logger.createLogger({
    name: 'myserver',
    streams: [{
        type: "raw",
        stream: stream
    }],
    serializers: {
        err: Logger.stdSerializers.err,
        req: Logger.stdSerializers.req,
        res: Logger.stdSerializers.res
    }
});


// If configured, require the user to provide Basic Authentication details to view
// this site (useful when the site is hosted publicly but still in development).
if (config.requireBasicAuth)
{
    if (!config.basicAuthUsername || !config.basicAuthPassword)
    {
        console.log('Username or password is not set, exiting.');
        process.exit(1);
    }
    app.use(express.basicAuth(config.basicAuthUsername, config.basicAuthPassword));
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
        // TODO: Review if we need to keep the following line?
        done = true;
    }
}));

// Application settings
app.engine('html', require(__dirname + '/lib/template-engine.js').__express);
app.set('view engine', 'html');
app.set('vendorViews', __dirname + '/govuk_modules/govuk_template/views/layouts');
app.set('views', __dirname + '/app/views');

app.use(express.cookieParser());

// TODO: Decide on session storage strategy.
var session_env = null;
if (config.sessionStorage.mode === 'redis')
{
    log.info('Session storage: using Redis');
    redis = require('connect-redis')(express);
    session_env = express.session({store: new redis(config.sessionStorage.redis), secret: config.sessionStorage.secret});
}
else
{
    log.info('Session storage: not using Redis');
    session_env = express.session({secret: config.sessionStorage.secret});
}
app.use(session_env);

// Middleware to serve static assets.
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

// Start the app.
app.listen(config.port);
console.log('');
console.log('Listening on port ' + config.port.toString());
console.log('');
