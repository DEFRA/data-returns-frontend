
/*
 * HTTP GET Handler for /02-send-your-data/07-failure
 * @param request
 * @param reply
 */
module.exports.getHandler = function (request, reply) {
  reply.view('02-send-your-data/07-failure', {
    errorMessage: request.session.get('errorMessage')
  });
};