const config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
const helpLinks = require('../config/dep-help-links');

module.exports = {
    'assetPath': '/public/',
    // Copy any required fields from the config variable, so that we don't expose this directly
    // to the views (it contains data we don't want to accidentally expose).
    "feedbackbanner": config.feedback.template.feedbackbanner,
    "analytics": {
        useGoogleAnalytics: config.useGoogleAnalytics,
        googleTagManagerId: config.googleTagManagerId
    },
    "CSS": {
        "isCompressed": config.compressCSS || false
    },
    "links": helpLinks.links,
    "config": config
};