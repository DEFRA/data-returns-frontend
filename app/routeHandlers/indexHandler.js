
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));

// redirect to index if on a local dev machine
module.exports.redirectToIndex = function (request, reply) {
  var location = (config.env && config.env === 'local') ? '/index' : '/01-start/01-start';
  reply.redirect(location);
};