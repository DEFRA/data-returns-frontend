// basic template handler
module.exports.getHandler = function (request, reply) {
    return reply.view('data-returns' + request.path);
};
