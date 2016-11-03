"use strict";
// const winston = require("winston");
var errorHandler = require('../lib/error-handler');

module.exports = {
    /*
     * HTTP GET Handler for the /content/review route
     * @Param request
     * @param reply
     */
    getHandler: function (request, reply) {
        if (request.query.errorCode || request.query.violationType) {
            reply.view('data-returns/content-review', {
                result: errorHandler.renderCorrectionMessage(request.query.errorCode, request.query.violationType, {}, "Content review default error message")
            });
        } else {
            let data = {
                compiledTemplates: Array.from(errorHandler.compiledTemplates.values())
            };
            reply.view('data-returns/content-review', data);
        }
    }
};