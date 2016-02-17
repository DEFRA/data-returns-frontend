'use strict';
// File error messages
module.exports.FILE_HANDLER = {
  INVALID_CONTENT_TYPE: 'The file is not a CSV file',
  NOT_CSV: 'The file is not a CSV file',
  ZERO_BYTES: 'The file is empty'
};
// API error messages
module.exports.API = {
  'ECONNREFUSED': '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
    + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>',
  'UNKNOWN': '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
    + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>',
  'ERRORPAGETEXT': 'There is a problem',
  'ERRBUTTONTEXT': 'Start again',
  'NOT_CSV': 'All data files returned using this service must be in CSV format.',
  'SELECTANOTHERFILE': 'Select another file',
  'SCHEMA_ERROR_MESSAGE': 'Validation Errors',
  'INVALID_CONTENTS': 'The file contains invalid contents',
  'UNSUPPORTED_FILE_TYPE': 'All data files returned using this service must be in CSV format.',
  'MULTIPLE_RETURNS': 'There are multiple returns in this file',
  'MULTIPLE_PERMITS': '<h2 class="heading-small"><span class="error-message">Your file contains more than 1 EA unique identifier (EA_ID)</span></h2>'
    + '<p>You can use this online service to submit compliance monitoring data under a single EA_ID (unique identifier or permit number).</p>'
    + '<p>You need to submit more than one file if you have data returns for several EA_IDs. You must start again for each EA_ID.</p>'
    + '<p><a href="{{RegimeSpecificRules}}" rel="external" targer="_blank">Find out more about how to submit the correct EA_ID</a></p>',
  'NO_RETURNS': '<h2 class="heading-small"><span class="error-message">Your file is empty</span></h2><p>Make sure you’ve submitted the right file and try again.</p>',
  'PERMIT_NOT_FOUND': '<h2 class="heading-small"><span class="error-message">Your EA unique identifier (EA_ID) isn’t recognised</span></h2>'
    + '<p>Check that the reference you’ve given is:</p>'
    + '<ul class="list list-bullet">'
    + '<li>either 2 letters and 4 numbers (EPR permits) or a 5- or 6-figure number (older waste management licences)</li>'
    + '<li>without separators, eg, slashes, or any exotic characters</li>'
    + '<li>exactly the same as given in your original permit, licence or mineral extractions agreement</li>'
    + '</ul>'
    + '<p><a href="{{RegimeSpecificRules}}" rel="external" targer="_blank">Find out more about how to submit the correct EA_ID</a></p>' 
    + '<p><a href="{{HowToFormatEnvironmentAgencyData}}" rel="external" targer="_blank">Find out about formatting all your data to meet EA standards</a></p>'
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
  'MULTIPLE_PERMITS': 703,
  //'MULTIPLE_RETURNS': 703,
  'PERMIT_NOT_FOUND': 704,
  'COLUMN_NAME_NOT_FOUND':706
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
  INVALID_PIN: '<p>We sent a confirmation code to {{emailAddress}}</p>'
    + '<details class="help-confirmation-code">'
    + '  <summary><span class="summary">What’s a confirmation code?</span></summary>'
    + '  <div class="panel panel-border-wide">'
    + '    <p>This is a 4-digit code for you to enter in your browser. We use it to confirm your email address is correct so you can send your data returns file and get a receipt.</p>'
    + '  </div>'
    + '</details>'
    + '<p>Check you’ve entered the right code in your browser. Try again.</p>'
    + '<p>Check that you’ve entered the code within 24 hours of getting the email. If your code has expired you need to start again.</p>',
  PIN_NOT_FOUND: 'Pin Not Found',
  VALID_PIN: 'Pin is valid'
};
// Anti virus scanning error messages
module.exports.ANTIVIRUS = {
  VIRUS_DETECTED: '<h1 class="heading-medium error-summary-heading">Your file is unsafe.</h1>'
    + '<p>Your file hasn’t passed the security check so it might contain a virus or other suspicious content. Check your file and try again.</p>'
};




