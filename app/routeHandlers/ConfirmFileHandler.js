"use strict";
var utils = require('../lib/utils');
var cacheHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET Handler for the /file/confirm route
     * @Param request
     * @param reply
     */
    getHandler: function (request, reply) {
        var sessionID = utils.base64Decode(request.state['data-returns-id']);
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);

        cacheHandler.arrayGet(key).then(function(uploads) {
            var data = {
                "files": uploads,
                RegimeSpecificRules: HelpLinks.links.RegimeSpecificRules,
                HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
            };
            reply.view('data-returns/confirm-your-file', data);
        }).catch(function() {
            console.log("Unable to retrieve stored uploads array.");
            reply.redirect('data-returns/failure');
        });
    },
    /*
     * HTTP POST Handler for the /file/confirm route
     * @Param request
     * @param reply
     * Redirects the current page
     */
    postHandler: function (request, reply) {
        reply.redirect('data-returns/failure');
    }
};