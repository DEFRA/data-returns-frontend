/* function name : processCallback
 * Description : processes the callbacks called from the backend java api 
 * returns an object containing a url and the data to display
 * Called from routes.js
 * History :
 * [NeilH] 23-Nov-2015 - initial version - code moved from routes.js, removed as much duplication as I could.
 * made some codes and messages configurable
 */
"USE STRICT";

var apiRoutes = require(__dirname + "/api-routes.js");
var errorConfig = require(__dirname + "/error-messages.js");

module.exports.processCallback = function (stage, isCheckingOnly, apierror, httpResponseCode, body, callback) {

  var result = null;
  var route = null;

  if (apierror || (httpResponseCode !== null && httpResponseCode !== apiRoutes.STATUS_CODES.OK)) {

    var errMess = errorConfig.API.unknown;

    if (apierror) {
      errMess = (apierror && apierror.code === errorConfig.ERROR_CODES.ECONNREFUSED) ? errorConfig.API.ECONNREFUSED : errorConfig.API.unknown;
    } else {// assume java app error
      body = JSON.parse(body);
      errMess = body.message;
    }

    result = {
      pageText: errorConfig.API.ERRORPAGETEXT,
      message: errMess,
      errButtonText: errorConfig.API.ERRBUTTONTEXT
    };
  }

  switch (stage) {
    case 'upload':

      if (apierror) {
        result.errButtonAction = isCheckingOnly ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data';
        route = isCheckingOnly ? apiRoutes.routing.ERRORCHECKING : apiRoutes.routing.ERRORSENDING;
      } else {

        if (httpResponseCode !== apiRoutes.STATUS_CODES.OK) {
          result.errButtonAction = isCheckingOnly ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data';
          route = isCheckingOnly ? apiRoutes.routing.ERRORCHECKING : apiRoutes.routing.ERRORSENDING;
        } else {
          result = JSON.parse(body);
          /*session.fileKey = result.fileKey;
           session.eaId = result.eaId;
           session.siteName = result.siteName;
           session.returnType = result.returnType;*/
          route = isCheckingOnly ? '02-check-your-data/03-verify-your-file' : '04-send-your-data/03-verify-your-file';
        }
      }
      break;

    case 'validate':

      if (apierror) {
        result.errButtonAction = isCheckingOnly ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data';
        route = isCheckingOnly ? apiRoutes.routing.ERRORCHECKING : apiRoutes.routing.ERRORSENDING;
      } else {
        if (httpResponseCode !== apiRoutes.STATUS_CODES.OK) {
          //result = JSON.parse(body);
          route = isCheckingOnly ? apiRoutes.routing.ERRORCHECKING : apiRoutes.routing.ERRORSENDING;
          result.errButtonAction = isCheckingOnly ? '/02-check-your-data/01-upload-your-data' : '/04-send-your-data/01-upload-your-data';
        } else if (result.appStatusCode === 800) {
          result = JSON.parse(body);
          route = isCheckingOnly ? '02-check-your-data/04-success' : '04-send-your-data/04-success';
        } else {
          result = JSON.parse(body);
          route = isCheckingOnly ? '02-check-your-data/05-failure' : '04-send-your-data/05-failure';
        }
      }
      break;

    case 'complete':

      if (apierror) {
        route = 'error_sending';
        result.errButtonAction = '/04-send-your-data/01-upload-your-data';
      } else {
        result = JSON.parse(body);

        if (httpResponseCode !== apiRoutes.STATUS_CODES.OK) {
          route = 'error_sending';
          result.errButtonAction = '/04-send-your-data/01-upload-your-data';
          result.message = result.message ? result.message : result.errors[0];
        } else {
          route = '04-send-your-data/07-done';
        }
      }
      break;
  }

  var data = {
    "route": route,
    "result": result
  };

  // console.log("<== processCallback() ", "stage:" + stage, "route:" + route, "result:" + JSON.stringify(result));

  callback(data);


};