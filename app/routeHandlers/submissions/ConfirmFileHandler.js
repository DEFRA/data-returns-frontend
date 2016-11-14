"use strict";
const winston = require("winston");
let userHandler = require('../../lib/user-handler');

module.exports = {
    /*
     * HTTP GET Handler for the /file/confirm route
     * @Param request
     * @param reply
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);

        userHandler.getUploads(sessionID).then(function(uploads) {
            if (uploads && uploads.length > 0) {
                reply.view('data-returns/confirm-your-file', { "files": uploads });
            } else {
                // Show file-unavailable page if the file uploads array is empty
                reply.view('data-returns/file-unavailable');
            }
        }).catch(function() {
            winston.error("Unable to retrieve stored uploads array.");
            reply.redirect('data-returns/failure');
        });
    }
};