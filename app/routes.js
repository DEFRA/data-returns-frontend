<<<<<<< HEAD
'use strict';

const Path = require('path');
const Joi = require('joi');
const Utils = require('./lib/utils.js');
const CsvValidator = require('./lib/csv-validator.js');
const ApiHandler = require('./lib/api-handler.js');

const redirectToIndexHandler = function (request, reply) {
    return reply.redirect('/index');
};

const basicTemplateHandler = function (request, reply) {
    return reply.view(request.path.substring(1));
};

// TODO: Split handlers into page-specific files (for easier management)?
// TODO: Add validation handlers so that user cannot "jump" to page without going through intended journey.
// TODO: Think about more / better logging.
// TODO: Move session-management code into a helper.
module.exports = [
    // Static assets.
    {
        method: 'GET',
        path: '/public/{param*}',
        handler: {
            directory: {
                path: [
                    'public/',
                    'govuk_modules/govuk_template/assets',
                    'govuk_modules/govuk_frontend_toolkit'
                ],
                etagMethod: 'hash' // Allows assets to be cached by the client.
            }
        }
    },

    // TODO: Make redirection environment-specific, and rename the index to "development" or similar.
    // Redirect for site root.
    {
        method: 'GET',
        path: '/',
        handler: redirectToIndexHandler
    },

    // Index page (visible in development only).
    // TODO: Rename
    {
        method: 'GET',
        path: '/index',
        handler: basicTemplateHandler
    },

    // Start page.
    {
        method: 'GET',
        path: '/01-start/01-start',
        handler: basicTemplateHandler
    },
    {
        method: 'POST',
        path: '/01-start/01-start',
        handler: function (request, reply) {
            request.session.reset();
            reply.redirect('/02-send-your-data/01-upload-your-data');
        }
    },

    // 01-Upload-Your-Data.
    {
        method: 'GET',
        path: '/02-send-your-data/01-upload-your-data',
        handler: basicTemplateHandler
    },
    {
        method: 'POST',
        path: '/02-send-your-data/01-upload-your-data',
        config: {
            payload: {
                maxBytes: 1 * Math.pow(2, 20),  // 1 megabyte
                timeout: 20 * 1000,         // 20 seconds
                output: 'file',
                parse: true
            }
        },
        handler: function (request, reply) {
            // TODO: Clean-up files once transferred to API tier.
            request.log(['info', 'file-upload'], 'Processing uploaded file...');

            var contentType = request.payload.fileUpload.headers['content-type'] || null;
            var sourceName = request.payload.fileUpload.filename;
            var oldLocalName = request.payload.fileUpload.path;
            var newLocalName = oldLocalName.concat(Path.extname(sourceName));

            Utils.renameFile(oldLocalName, newLocalName)
                .then(function () {
                    return CsvValidator.validateFile(newLocalName, contentType);
                })
                .then(function () {
                    return ApiHandler.uploadFileToService(newLocalName);
                })
                .then(function (apiResponse) {
                    // TODO: Review whether we need a front-end database.
                    request.session.set('returnMetaData', {
                        fileName: sourceName,
                        fileKey: apiResponse.fileKey,
                        eaId: apiResponse.eaId,
                        returnType: apiResponse.returnType,
                        siteName: apiResponse.siteName
                    });
                    reply.redirect('/02-send-your-data/02-verify-your-file');
                }).catch(function (errorData) {
                    request.log(['error', 'file-upload'], Utils.getBestLogMessageFromError(errorData));
                    request.session.clear('returnMetaData');
                    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {
                        reply.view('02-send-your-data/01-upload-your-data', {
                            uploadError: true,
                            errorMessage: errorData.message
                        });
                    } else {
                        request.session.flash('errorMessage', errorData.message);
                        reply.redirect('/02-send-your-data/07-failure');
                    }
                });

        }
    },

    // 02-Verify-Your-File.
    {
        method: 'GET',
        path: '/02-send-your-data/02-verify-your-file',
        handler: function (request, reply) {
            reply.view('02-send-your-data/02-verify-your-file', {
                returnMetaData: request.session.get('returnMetaData')
            });
        }
    },
    {
        method: 'POST',
        path: '/02-send-your-data/02-verify-your-file',
        handler: function (request, reply) {
            reply.redirect('/02-send-your-data/06-failure');
        }
    },

    // 06-Failure (file content validation).
    // TODO: Rename.
    {
        method: 'GET',
        path: '/02-send-your-data/06-failure',
        handler: function(request, reply) {
            ApiHandler.validateFileContents(request.session.get('returnMetaData'))
                .then(function () {
                    reply.redirect('/02-send-your-data/03-email');
                })
                .catch(function (errorData) {
                    request.log(['error', 'file-validate'], Utils.getBestLogMessageFromError(errorData));
                    if ((errorData !== null) && ('isUserError' in errorData) && (errorData.isUserError)) {
                        reply.view('02-send-your-data/06-failure', {
                            result: {
                                errors: errorData.apiErrors
                            }
                        });
                    } else {
                        request.session.flash('errorMessage', errorData.message);
                        reply.redirect('/02-send-your-data/07-failure');
                    }
                });
        }
    },

    // 03-Email.
    // TODO: Implement email sending.
    // TODO: Proper PIN generation.
    // TODO: Skip this page if user has already authenticated.
    {
        method: 'GET',
        path: '/02-send-your-data/03-email',
        handler: function (request, reply) {
            reply.view('02-send-your-data/03-email', {
                returnMetaData: request.session.get('returnMetaData')
            });
        }
    },
    {
        method: 'POST',
        path: '/02-send-your-data/03-email',
        handler: function (request, reply) {
            var validationResult = Joi.string().email().required().validate(request.payload['user_email']);
            if (validationResult.error !== null) {
                reply.view('02-send-your-data/03-email', {
                    returnMetaData: request.session.get('returnMetaData'),
                    invalidEmailAddress: true
                });
            } else {
                request.session.set('user', {
                    authenticated: false,
                    email: request.payload['user_email'],
                    pin: '1234'
                });
                reply.redirect('/02-send-your-data/04-authenticate');
            }
        }
    },

    // 04-Authenticate.
    // TODO: Move PIN validation to a helper.
    // TODO: Implement "maximum number of tries" logic.
    {
        method: 'GET',
        path: '/02-send-your-data/04-authenticate',
        handler: basicTemplateHandler
    },
    {
        method: 'POST',
        path: '/02-send-your-data/04-authenticate',
        handler: function(request, reply) {
            var userData = request.session.get('user');
            if (request.payload['validation_code'].toString().trim() === userData.pin) {
                userData.authenticated = true;
                userData.pin = Number.NaN;
                request.session.set('user', userData);
                reply.redirect('/02-send-your-data/05-success');
            } else {
                reply.view('02-send-your-data/04-authenticate', {
                    invalidPin: true
                });
            }
        }
    },

    // 05-Success.
    {
        method: 'GET',
        path: '/02-send-your-data/05-success',
        handler: function(request, reply) {
            reply.view('02-send-your-data/05-success', {
                returnMetaData: request.session.get('returnMetaData')
            });
        }
    },
    {
        method: 'POST',
        path: '/02-send-your-data/05-success',
        handler: function (request, reply) {
            var returnMetaData = request.session.get('returnMetaData');
            var userData = request.session.get('user');
            ApiHandler.confirmFileSubmission(returnMetaData.fileKey, userData.email)
                .then(function () {
                    reply.redirect('/02-send-your-data/08-done');
                })
                .catch(function (errorData) {
                    request.log(['error', 'file-submit'], Utils.getBestLogMessageFromError(errorData));
                    request.session.flash('errorMessage', errorData.message);
                    reply.redirect('/02-send-your-data/07-failure');
                });
        }
    },

    // 07-Failure (unrecoverable).
    {
        method: 'GET',
        path: '/02-send-your-data/07-failure',
        handler: function (request, reply) {
            reply.view('02-send-your-data/07-failure', {
                errorMessage: request.session.get('errorMessage')
            });
        }
    },

    // 08-Done.
    {
        method: 'GET',
        path: '/02-send-your-data/08-done',
        handler: function(request, reply) {
            reply.view('02-send-your-data/08-done', {
                userEmail: request.session.get('user').email
            });
        }
    },

    // Help pages.
    {
        method: 'GET',
        path: '/05-help/01-help',
        handler: basicTemplateHandler
    }
];
=======
/* global config */

'use strict';
var config = require('./config/configuration_' + (process.env.NODE_ENV || 'local'));
var IndexHandler = require('./routeHandlers/indexHandler');
var BasicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var O1O1Handler = require('./routeHandlers/O1O1Handler');
var O2O1Handler = require('./routeHandlers/O2O1Handler');
var O2O2Handler = require('./routeHandlers/O2O2Handler');
var O2O3Handler = require('./routeHandlers/O2O3Handler');
var O204Handler = require('./routeHandlers/O2O4Handler');
var O2O5Handler = require('./routeHandlers/O2O5Handler');
var O2O6Handler = require('./routeHandlers/O2O6Handler');
var O2O7Handler = require('./routeHandlers/O2O7Handler');
var O2O8Handler = require('./routeHandlers/O2O8Handler');
var O2O9Handler = require('./routeHandlers/O2O9Handler');
var O21OHandler = require('./routeHandlers/O210Handler');

//var InvalidCSVHandler = require('./routeHandlers/invalidCSVHandler');
//var EmptyFileHandler = require('./routeHandlers/EmptyFileHandler');

// TODO: Add validation handlers so that user cannot "jump" to page without going through intended journey.
// TODO: Think about more / better logging.

module.exports = [
  // Static assets.
  {
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: [
          'public/',
          'govuk_modules/govuk_template/assets',
          'govuk_modules/govuk_frontend_toolkit'
        ],
        etagMethod: 'hash' // Allows assets to be cached by the client.
      }
    }
  },
  // TODO: Make redirection environment-specific, and rename the index to "development" or similar.
  // Redirect for site root.
  {
    method: 'GET',
    path: '/',
    handler: IndexHandler.redirectToIndex
  },
  // Index page (visible in development only).
  // TODO: Rename
  {
    method: 'GET',
    path: '/index',
    handler: BasicTemplateHandler.getHandler
  },
  // Start page.
  {
    method: 'GET',
    path: '/01-start/01-start',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/01-start/01-start',
    handler: O1O1Handler.postHandler
  },
  // 01-Upload-Your-Data.
  {
    method: 'GET',
    path: '/02-send-your-data/01-upload-your-data',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/01-upload-your-data',
    config: {
      payload: {
        maxBytes: 2 * Math.pow(2, 20), // 2 megabytes 
        //TODO add large file check to validator as it is not handled.
        timeout: 60 * 1000, // 20 seconds
        output: 'file',
        parse: true,
        uploads: config.upload.path
      }
    },
    handler: O2O1Handler.postHandler
  },
  // 02-Verify-Your-File.
  {
    method: 'GET',
    path: '/02-send-your-data/02-verify-your-file',
    handler: O2O2Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/02-verify-your-file',
    handler: O2O2Handler.postHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/06-check',
    handler: O2O6Handler.getHandler
  },
  // 03-Email.
  {
    method: 'GET',
    path: '/02-send-your-data/03-email',
    handler: O2O3Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/03-email',
    handler: O2O3Handler.postHandler
  },
  // 04-Authenticate.
  {
    method: 'GET',
    path: '/02-send-your-data/04-authenticate',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/04-authenticate',
    handler: O204Handler.postHandler
  },
  // 05-Success.
  {
    method: 'GET',
    path: '/02-send-your-data/05-success',
    handler: O2O5Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/05-success',
    handler: O2O5Handler.postHandler
  },
  // 07-Failure (unrecoverable).
  {
    method: 'GET',
    path: '/02-send-your-data/07-failure',
    handler: O2O7Handler.getHandler
  },
  // 08-Done.
  {
    method: 'GET',
    path: '/02-send-your-data/08-done',
    handler: O2O8Handler.getHandler
  },
  // Help pages.
  {
    method: 'GET',
    path: '/05-help/01-help',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/09-errors',
    handler: O2O9Handler.getHandler //BasicTemplateHandler.getHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/10-error-detail',
    handler: O21OHandler.getHandler
  }
];

>>>>>>> HAPI-Changes
