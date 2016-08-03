//basic template handler
module.exports.getHandler = function (request, reply) {
    return reply.view(request.path.substring(1));
};