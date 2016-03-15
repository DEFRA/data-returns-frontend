'use strict';
// File error messages
module.exports.FILE_HANDLER = {
  INVALID_CONTENT_TYPE: 'The file is not a CSV file',
  NOT_CSV: 'The file is not a CSV file',
  ZERO_BYTES: 'The file is empty'
};

//Validation codes
module.exports.status = {
  'SUCCESSFULL': {code: 0},
  'APPLICATION_ERROR_CODE': {code: 801},
  'VALIDATION_ERRORS': {code: 801, errormessage: 'Validation Errors', helplink: ''},
  'ECONNREFUSED': {code: 'ECONNREFUSED', errormessage: '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
      + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>', helplink: ''},
  'NOTIFICATION_FAILURE': {code: 604, errormessage: 'The smtp service (SES) is not available.', helplink: ''},
  'UNKNOWN': {code: 0, errormessage: '<h2 class="heading-small"><span class="error-message">Your file hasn’t been sent</span></h2>'
      + '<p>We’re sorry but something has gone wrong with the service which means you can’t send your file.</p>', helplink: ''},
  'UNSUPPORTED_FILE_TYPE': {code: 700, errormessage: 'All data files returned using this service must be in CSV format.', helplink: ''},
  'INVALID_CONTENTS': {code: 701, errormessage: 'The file contains invalid contents', helplink: ''},
  'NO_RETURNS': {code: 702,
    errormessage: '<h2 class="heading-small"><span class="error-message">Your file is empty</span></h2><p>Make sure you’ve submitted the right file and try again.</p>',
    helplink: ''},
  'MULTIPLE_PERMITS': {code: 703, errormessage: '<h2 class="heading-small"><span class="error-message">Your file contains more than 1 EA unique identifier (EA_ID)</span></h2>'
      + '<p>You can use this online service to submit compliance monitoring data under a single EA_ID (unique identifier or permit number).</p>'
      + '<p>You need to submit more than one file if you have data returns for several EA_IDs. You must start again for each EA_ID.</p>'
      + '<p><a href="{{RegimeSpecificRules}}" rel="external" target="DRHELPPAGE">Find out more about how to submit the correct EA_ID</a></p>', helplink: ''},
    'PERMIT_NOT_FOUND': {code: 704, errormessage: '<h2 class="heading-small"><span class="error-message">Your EA unique identifier (EA_ID) isn’t recognised</span></h2>'
        + '<p>Check that the reference you’ve given is:</p>'
        + '<ul class="list list-bullet">'
        + '<li>either 2 letters and 4 numbers (EPR permits) or a 5- or 6-figure number (older waste management licences)</li>'
        + '<li>without separators, eg, slashes, or any exotic characters</li>'
        + '<li>exactly the same as given in your original permit, licence or mineral extractions agreement</li>'
        + '</ul>'
        + '<p><a href="{{RegimeSpecificRules}}" rel="external" target="DRHELPPAGE">Find out more about how to submit the correct EA_ID</a></p>'
        + '<p><a href="{{HowToFormatEnvironmentAgencyData}}" rel="external" target="DRHELPPAGE">Find out about formatting all your data to meet EA standards</a></p>', helplink: ''},
  'COLUMN_NAME_NOT_FOUND': {code: 706, errormessage: '', helplink: ''},
  'INVALID_PERMIT': {code: 707, errormessage: '<h2 class="heading-small"><span class="error-message">Your EA unique identifier (EA_ID) isn’t recognised</span></h2>'
        + '<p>Check that the reference you’ve given is:</p>'
        + '<ul class="list list-bullet">'
        + '<li>either 2 letters and 4 numbers (EPR permits) or a 5- or 6-figure number (older waste management licences)</li>'
        + '<li>without separators, eg, slashes, or any exotic characters</li>'
        + '<li>exactly the same as given in your original permit, licence or mineral extractions agreement</li>'
        + '</ul>'
        + '<p><a href="{{RegimeSpecificRules}}" rel="external" target="DRHELPPAGE">Find out more about how to submit the correct EA_ID</a></p>'
        + '<p><a href="{{HowToFormatEnvironmentAgencyData}}" rel="external" target="DRHELPPAGE">Find out about formatting all your data to meet EA standards</a></p>', helplink: ''}
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




