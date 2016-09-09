'use strict';
/*
 * Default configuration for Data Returns front-end.
 * Settings below should be overridden where necessary for each environment.
 *
 * Some settings are likely to be set via environment variables.  In these cases,
 * the configuration files should always prefer the environment variable value
 * over a hard-coded default.
 *
 * Environment variable naming conventions:
 *    DRF_***            "Data Returns Frontend ***"
 *    DRF_BA_***         "Data Returns Frontend Basic Authentication ***"
 *    DRF_SS_***         "Data Returns Frontend Session Storage ***"
 *    DRF_SS_REDIS_***   "Data Returns Frontend Session Storage (using Redis) ***"
 */
var config = {};
config.appversion = '1.0.17';

// By default we'll start with a non-specific environment name.
// This should always be overridden with something more meaningful.
config.env = 'default';
// The port this service will run on.
config.http = {};
config.http.port = process.env.PORT || 3000;

// Parameters controlling session storage method.
// 'mode' can be 'default' or 'redis'.
// A good secret key should be used in public-facing environments.
config.sessionStorage = {
    mode: 'default',
    /* From HAPI v13.0.0 the secret must be at least 32 chars  */
    secret: process.env.DRF_SS_SECRET_KEY || 'zaq12wsXcDe34rfvbgt56yHnmJu78ik9o'
};

//SMTP Configuration
config.smtp = config.smtp || {};
config.smtp.mailcatcher = {};
config.smtp.pinsubject = ' is your data returns online confirmation code';
config.smtp.confirmsubject = 'Send data returns online - your receipt';
config.smtp.success = '250 Message accepted';
config.smtp.ealogo = 'http://assets.digital.cabinet-office.gov.uk/government/uploads/system/uploads/organisation/logo/199/EAlogo.png';
config.smtp.govuklogo = 'http://dr-dev.envage.co.uk/public/images/govuk_logotype_email.png';
config.smtp.crownLogo = 'http://www.tax.service.gov.uk/assets/2.30.0/images/gov.uk_logotype_crown.png';
config.smtp.max_limit = 10;
config.smtp.max_time_minutes = 10;
config.smtp.lockout_time_seconds = (60 * 60); // 1hr
// never lock these users out
config.smtp.email_address_white_list = ['hkjtest@gmail.com', 'hkjtest2@gmail.com', 'unwantedspammailcatcher@gmail.com'];


//Pin configuration
config.pin = {
    maxDigits: 4,
    MaxUploadsPerPin: 10,
    ValidTimePeriodMinutes: 60 * 24,
    TTL: 1000,
    useTTL: false,
    alwaysGenerate: true,
    maxretries: 10
};

// initial File upload directory where virus checker can find the files
config.upload = {
    path: '/tmp/data-returns/uploads'
};

//logging config
config.log = {};
config.log.responses = true;

// feedback configuration
config.feedback = {};
config.feedback.emailaddress = 'Data_Returns@environment-agency.gov.uk';
config.feedback.subject = 'Feedback from Data Returns (' + config.env + ')';
config.feedback.mailto = config.feedback.emailaddress + '?Subject=' + config.feedback.subject;
config.feedback.template = {feedbackbanner: '<div class="phase-banner-beta"><p><strong class="phase-tag">BETA</strong><span>This is a new service – your <a href="http://www.smartsurvey.co.uk/s/DRFeedback/">feedback</a> will help us to improve it.</span></p></div>'};

// Secret key for the HMAC-SHA256 hash
config.crypto = {};
config.crypto.sha_function = 'sha256';
//config.crypto.secret_key = 'failYRand0mizedk3Y';
config.crypto.secret_key = process.env.DR_API_KEY;

config.startup = {
    "runUnitTests": false,
    "runLinter": false
};
// Publish the configuration
module.exports = config;
