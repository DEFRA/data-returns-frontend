'use strict';
// File error messages
module.exports.FILE_HANDLER = {
  INVALID_CONTENT_TYPE: 'The file is not a CSV file',
  NOT_CSV: 'The file is not a CSV file',
  ZERO_BYTES: 'The file is empty'
};
// API error messages
module.exports.API = {
  'ECONNREFUSED': '! Your file hasn’t been sent'
    + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>',
  'UNKNOWN': '! Your file hasn’t been sent'
    + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>',
  'ERRORPAGETEXT': 'There is a problem',
  'ERRBUTTONTEXT': 'Start again',
  'NOT_CSV': 'All data files returned using this service must be in CSV format.',
  'SELECTANOTHERFILE': 'Select another file',
  'SCHEMA_ERROR_MESSAGE': 'Validation Errors',
  'INVALID_CONTENTS': 'The file contains invalid contents',
  'UNSUPPORTED_FILE_TYPE': 'All data files returned using this service must be in CSV format.',
  'MULTIPLE_RETURNS': 'There are multiple returns in this file',
  'MULTIPLE_PERMITS': '! Your file contains more than 1 EA unique identifier (EA_ID)'
    + '<p>You can use this online service to submit compliance monitoring data<br>under a single EA_ID (unique identifier or permit number).</p>'
    + '<p>You need to submit more than one file if you have data returns for<br>several EA_IDs. You must start again for each EA_ID.</p>',
  'NO_RETURNS': '! Your file is empty <br>Make sure you’ve submitted the right file and try again.',
  'PERMIT_NOT_FOUND': '! Your EA unique identifier (EA_ID) isn’t recognised'
    + '<p>Check that the reference you’ve given is:<br>'
    + '<ul><li>either 2 letters and 4 numbers (EPR permits) or a 5- or 6-figure number (older waste management licences)</li>'
    + '<li>without separators, eg, slashes, or any exotic characters</li>'
    + '<li>exactly the same as given in your original permit, licence or mineral extractions agreement</li></ul></p>'
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
  INVALID_PIN_CODE: 'INVALID_PIN_CODE',
  INVALID_PIN: '! Your code doesn’t work<br>'
    + 'We sent a confirmation code to {{emailAddress}}'
    + '<p>Check you’ve entered the right code in your browser. Try again.<br>'
    + 'Check that you’ve entered the code within x minutes/hours of getting the email. If you’re code<br>'
    + 'has expired you can request a new code.</p>'
    + '<p>What’s a confirmation code?<br>'
    + 'This is a 4-digit code for you to enter in your browser. We use it to confirm your email address is correct so you can and send your data returns file and get a receipt.</p>',
  PIN_NOT_FOUND: 'Pin Not Found',
  VALID_PIN: 'Pin is valid'
};
// Anti virus scanning error messages
module.exports.ANTIVIRUS = {
  VIRUS_DETECTED: '! Your file is unsafe. Your file hasn’t passed the security check so it might contain a virus or other suspicious content. Check your file and try again.'
};




