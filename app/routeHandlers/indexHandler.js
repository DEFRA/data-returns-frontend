
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));

// redirect to index if on a local dev machine
module.exports.redirectToIndex = function (request, reply) {
  reply.redirect('/01-start/01-start');
};