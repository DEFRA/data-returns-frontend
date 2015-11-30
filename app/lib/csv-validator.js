"USE STRICT";

var ERROR_MESSAGES = require(__dirname + "/error-messages.js");

//var file = require('file');

var isValidCSV = function (csvfile, callback) {

  /* so what is a valid CSV file ? 
   * 
   * 1) CSV extention is required ?
   * 2) must not be zero bytes
   * 3) One of many mime types?
   * 4) Have at least 2 rows, 1 header and 1 data row?
   */

  var result = true;
  var err = null;
  var fileExt = csvfile.extension;

  var result = {
    pageText: ERROR_MESSAGES.API.ERRORPAGETEXT,
    errButtonText: ERROR_MESSAGES.API.ERRBUTTONTEXT
  };

  if (fileExt.toUpperCase() !== 'CSV') {
    err = new Error(ERROR_MESSAGES.FILE_HANDLER.NOT_CSV);
    result.message = ERROR_MESSAGES.FILE_HANDLER.NOT_CSV;
  }

  if (csvfile.size === 0) {
    err = new Error(ERROR_MESSAGES.FILE_HANDLER.ZERO_BYTES);
    result.message = ERROR_MESSAGES.FILE_HANDLER.ZERO_BYTES;
  }

  /* Check for valid mime types */
  /* was going to implement a check, however the upload is always "application/octet-stream" with multer */

  result.errButtonAction = csvfile.checking_only === true ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data';

  callback(err, result);

};


module.exports.isValidCSV = isValidCSV;




