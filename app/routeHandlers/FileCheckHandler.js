var userHandler = require('../lib/user-handler');
const errbit = require("../lib/errbit-handler");
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
            errbit.notify(err);
            reply.redirect('/email');
        });
};
