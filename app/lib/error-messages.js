'use strict';
// File error messages
module.exports.FILE_HANDLER = {
  INVALID_CONTENT_TYPE: 'The file is not a CSV file',
  NOT_CSV: 'The file is not a CSV file',
  ZERO_BYTES: 'The file is empty'
};

// API error messages
module.exports.API = {
  'ECONNREFUSED': 'The Data Exchange Service is not available',
  'UNKNOWN': 'Unknown Error',
  'ERRORPAGETEXT': 'There is a problem',
  'ERRBUTTONTEXT': 'Start again',
  'NOT_CSV': 'All data files returned using this service must be in CSV format.',
  'SELECTANOTHERFILE': 'Select another file',
  'SCHEMA_ERROR_MESSAGE': 'Validation Errors',
  'INVALID_CONTENTS': 'The file contains invalid contents',
  'UNSUPPORTED_FILE_TYPE': 'All data files returned using this service must be in CSV format.',
  'MULTIPLE_RETURNS': 'There are multiple returns in this file',
  'MULTIPLE_PERMITS': 'There are multiple permits in this file',
  'NO_RETURNS': 'There are no returns in this file',
  'PERMIT_NOT_FOUND': 'Permit number not found'
};

//API error codes
module.exports.ERROR_CODES = {
  'SUCCESSFULL': 800,
  'APPLICATION_ERROR_CODE': 801,
  'VALIDATION_ERRORS': 801,
  'ECONNREFUSED': 'ECONNREFUSED',
  'UNSUPPORTED_FILE_TYPE': 700,
  'INVALID_CONTENTS': 701,
  'NO_RETURNS': 702,
  'MULTIPLE_RETURNS': 703,
  'MULTIPLE_PERMITS': 704,
  'PERMIT_NOT_FOUND': 707
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

// Pin validation error messages
module.exports.PIN = {
  INVALID_PIN: 'Invalid Pin',
  PIN_NOT_FOUND: 'Pin Not Found',
  VALID_PIN: 'Pin is valid'
};

// Anti virus scanning error messages
module.exports.ANTIVIRUS = {
  VIRUS_DETECTED: '! Your file is unsafe. Your file hasn’t passed the security check so it might contain a virus or other suspicious content. Check your file and try again.'
};




