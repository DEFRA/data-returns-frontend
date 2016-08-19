var userHandler = require('../lib/user-handler');
const winston = require("winston");
/*
 * HTTP GET handler for gets for /file/check
 * @param {type} request
 * @param {type} reply
 */
module.exports.getHandler = function (request, reply) {
    var sessionID = userHandler.getSessionID(request);
    userHandler.isAuthenticated(sessionID)
        .then(function (result) {
            if (result === true) {
                reply.redirect('/file/send');
            } else {
                reply.redirect('/email');
            }
        })
        .catch(function (err) {
            winston.error(err);
            reply.redirect('/email');
        });
};
