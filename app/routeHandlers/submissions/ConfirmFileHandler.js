'use strict';
const winston = require('winston');
const userHandler = require('../../lib/user-handler');

function testForEaIdSubstitution (uploads) {
    for (const file of uploads) {
        for (const mapping of file.status.server.parseResult.mappings) {
            for (const identifier of mapping.identifiers) {
                if (identifier.substituted) {
                    return true;
                }
            }
        }
    }
    return false;
}

module.exports = {
    /*
     * HTTP GET Handler for the /file/confirm route
     * @Param request
     * @param reply
     */
    getHandler: function (request, reply) {
        const sessionID = userHandler.getSessionID(request);
        userHandler.getUploads(sessionID).then(function (uploads) {
            if (uploads && uploads.length > 0) {
                const displayEaIdSubstitutionsMsg = testForEaIdSubstitution(uploads);
                reply.view('data-returns/confirm-your-file', {
                    'files': uploads,
                    'displayEaIdSubstitutionsMsg': displayEaIdSubstitutionsMsg
                });
            } else {
                // Show file-unavailable page if the file uploads array is empty
                reply.view('data-returns/file-unavailable');
            }
        }).catch((e) => {
            winston.error(e);
            reply.redirect('/failure');
        });
    }
};
