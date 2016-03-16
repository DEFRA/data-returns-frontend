'use strict';
// File error messages
module.exports.FILE_HANDLER = {
  INVALID_CONTENT_TYPE: 'The file is not a CSV file',
  NOT_CSV: 'The file is not a CSV file',
  ZERO_BYTES: 'The file is empty'
};

//Validation codes
module.exports.status = {
  'SUCCESS': 200,
  'SUCCESSFULL': {code: 0},
  'APPLICATION_ERROR_CODE': {code: 801},
  'VALIDATION_ERRORS': {code: 801, errormessage: 'Validation Errors', helplink: ''},
  'ECONNREFUSED': {code: 'ECONNREFUSED', errormessage: '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
      + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>', helplink: ''},
  'NOTIFICATION_FAILURE': {code: 604, errormessage: 'The smtp service (SES) is not available.', helplink: ''},
  'UNKNOWN': {code: 0, errormessage: '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
      + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>', helplink: ''}
};

//SMTP Server error messages
module.exports.SMTP = {
  CONNECTION_REFUSED: {code: 'ECONNREFUSED', message: 'The SMTP Server refused the connection'},
  INVALIDEMAILADDRESS: 'Invalid email address'
};

//Redis error messages
module.exports.REDIS = {
  NOT_CONNECTED: 'Not connected to REDIS',
  KEY_NOT_FOUND: 'Key Not Found'
};

// Pin validation codes
module.exports.PIN = {
  VALID_PIN: 200,
  INVALID_PIN: 2225,
  PIN_EXPIRED: 2275
};


