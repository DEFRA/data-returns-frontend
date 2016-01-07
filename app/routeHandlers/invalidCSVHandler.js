
var ErrorMessages = require('../lib/error-messages');

//path: '/invalid_csv_file',
module.exports.getHandler = function (request, reply) {
  reply.redirect('02-send-your-data/01-upload-your-data', {
    uploadError: true,
    errorMessage: ErrorMessages.FILE_HANDLER.NOT_CSV
  });
};