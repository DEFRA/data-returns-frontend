"use strict";
const config = require('../lib/configuration-handler.js').Configuration;
const helpLinks = require('../config/dep-help-links');
const uuidGen = require('uuid');

module.exports = {
    'assetPath': '/public/',
    // Copy any required fields from the config variable, so that we don't expose this directly
    // to the views (it contains data we don't want to accidentally expose).
    "feedbackbanner": config.get('feedback.template.feedbackbanner'),
    "analytics": {
        useGoogleAnalytics: config.get('googleAnalytics.use'),
        googleTagManagerId: config.get('googleAnalytics.tagManagerId')
    },
    "CSS": {
        "isCompressed": config.get('css.compress') || false
    },
    "links": helpLinks.links,
    "config": config.getConfigObject(),
    "pgid": function() { return uuidGen.v4(); }
};