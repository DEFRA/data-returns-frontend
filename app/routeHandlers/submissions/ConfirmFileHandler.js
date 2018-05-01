'use strict';
const winston = require('winston');
const lodash = require('lodash');
const userHandler = require('../../lib/user-handler');

function prepareSummary (uploads) {
    const summaryData = {
        substitutions: false,
        files: []
    };

    for (const file of uploads) {
        const fileSummary = {
            name: file.name,
            sites: []
        };
        summaryData.files.push(fileSummary);

        if (file.status.server.parser_summary) {
            const summariesBySite = lodash.groupBy(file.status.server.parser_summary, 'site_name');

            for (const siteName of Object.keys(summariesBySite)) {
                const identifiers = summariesBySite[siteName];
                for (const summary of identifiers) {
                    if (summary.submitted_ea_id !== summary.resolved_ea_id) {
                        summary.substituted = true;
                        summaryData.substitutions = true;
                    }
                }
            }
            fileSummary.sites = Object.keys(summariesBySite).map(name => {
                return {name: name, identifiers: summariesBySite[name]};
            });
        }
    }
    return summaryData;
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
                reply.view('data-returns/confirm-your-file', {
                    'files': uploads,
                    'summary': prepareSummary(uploads)
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
