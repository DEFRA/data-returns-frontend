/*
 * Module handles sending notifications to errbit
 * reads an xml template file based on the airbrake v2.3 schema used by errbit
 * adds the error metadata and renders the xml using the template pre-compiled by hogan
 * Then HTTP Posts the rendered xml to the errbit server using the configured 
 */

var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var utils = require('../lib/utils');
var hogan = require('hogan.js');
var request = require('request');
var path = require('path');
var os = require('os');
var compiledTemplate;

//load and precompile the errbit xml template
utils.readFile('../config/errBitTemplate.xml', function (err, result) {
  if (err) {
    console.log('Unable to read errBit template ' + err);
  } else {
    compiledTemplate = hogan.compile(result);
  }
});

module.exports = {
  /*
   * notify
   * @param error - the error object
   */
  notify: function (message) {
    if (compiledTemplate && config.errbit.options.enabled === true && config.errbit.options.apiKey) {
      console.log('==> notify() sending message to errbit ', message);
      var data = {
        apiKey: config.errbit.options.apiKey,
        appVersion: config.appversion,
        appUrl: config.errbit.options.appUrl,
        errorClass: message.errorClass || 'Exception',
        errorMessage: message.message,
        method: message.method || 'Unknown',
        fileName: path.basename(message.fileName) || 'Unknown',
        lineNumber: message.lineNumber || 0,
        serverName: os.hostname(),
        projectRoot: config.errbit.options.projectRoot
      };

      var renderedXML = compiledTemplate.render(data);
      //console.log(renderedXML);

      var postRequest = {
        method: 'POST',
        uri: config.errbit.options.errBitServerURI,
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(renderedXML)
        }
      };

      console.log('  Posting to ', config.errbit.options.appUrl);
      var req = request(postRequest, function (error, response, body) {

        console.log('Response from errbit recieved');

        if (error) {
          console.log(error);
        }

        if (response) {
          console.log(response);
        }

        if (body) {
          console.log(body);
        }

      });

      req.write(renderedXML);
      req.end();

      console.log('Message sent to errBit');
    }
    return;
  }
};