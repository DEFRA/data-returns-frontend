'use strict';

/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */

var nodemailer = require('nodemailer');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var Joi = require('joi');
var errorMsgs = require('./error-messages.js');
var sender = config.smtp.fromEmailAddress;
var Hogan = require('hogan.js');
var emailTemplates = require('../config/configuration_email_templates');
var sendPinTemplate = emailTemplates.sendPinTemplate;
var compiledPinTemplate = Hogan.compile(sendPinTemplate);
var confirmationEmailTemplate = emailTemplates.confirmationEmailTemplate;
var compiledConfirmationEmailTemplate = Hogan.compile(confirmationEmailTemplate);
var Utils = require('./utils');

/* used by Joi to validate the email address */
var schema = {
  address: Joi.string().email()
};

/* validateEmailAddress
 * @param emailaddress - the email address to validate
 * @return Promise
 *  
 * A non valid email causes a reject to occur
 * otherwise resolves to true
 *    
 *    */
var validateEmailAddress = function (emailaddress) {

  return new Promise(function (resolve, reject) {

    var result = Joi.validate({'address': emailaddress}, schema);

    if (result.error) {
      reject({
        invalidEmailAddress: true,
        message: errorMsgs.SMTP.INVALIDEMAILADDRESS
      });
    } else {
      resolve(true);
    }
  });
};

/* Default Transport (SMTP Connection) */

var isUseCatcher = config.smtp.useMailCatcher === true ? true : false;

var transporter = nodemailer.createTransport({
  host: isUseCatcher ? config.smtp.mailcatcher.host : config.smtp.host,
  port: isUseCatcher ? config.smtp.mailcatcher.port : config.smtp.port,
  ignoreTLS: isUseCatcher ? config.smtp.mailcatcher.ignoreTLS : config.smtp.ignoreTLS,
  auth: {
    user: config.smtp.username,
    pass: config.smtp.password
  }
}, {
  // default values for sendMail method
  from: isUseCatcher ? sender : 'datareturns@envage.co.uk'
});

/* emails a recipient
 * @param recipient The recipients email address
 * @param the message to send
 * @returns a Promise 
 * An error sent back from the smtp server causes a reject.
 * Rejects return an object with an error message
 * */
var sendPinEmail = function (recipient, newPin) {

  return new Promise(function (resolve, reject) {

    var data = {
      pin: newPin
    };

    var emailBody = compiledPinTemplate.render(data);

    /* Set per email options */
    var mailOptions = {
      from: sender,
      to: recipient,
      subject: config.smtp.pinsubject + ' ' + newPin,
      text: emailBody,
      html: emailBody
    };

    /* Send the email */
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        if (error.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
          reject({
            isUserError: false, //TODO decide what to do with smtp server errors
            message: errorMsgs.SMTP.CONNECTION_REFUSED.message
          });
        }
      } else if (info.response === config.smtp.success) {
        resolve(true);
      }

    });
  });
};

var sendConfirmationEmail = function (userMail, filename) {

  return new Promise(function (resolve, reject) {

    var date = new Date();
    var displayDate = Utils.getFormatedDate(date);
    var time = Utils.getFormatedTime(date);

    var data = {
      FILENAME: filename,
      DATE: displayDate,
      TIME: time
    };

    var emailBody = compiledConfirmationEmailTemplate.render(data);
    
    var mailOptions = {
      from: sender,
      to: userMail,
      subject: config.smtp.confirmsubject,
      text: emailBody,
      html: emailBody
    };

    /* Send the email */
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        if (error.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
          reject({
            isUserError: false, //TODO decide what to do with smtp server errors
            message: errorMsgs.SMTP.CONNECTION_REFUSED.message
          });
        }
      } else if (info.response === config.smtp.success) {
        resolve(userMail);
      }

    });
  });

};

module.exports.validateEmailAddress = validateEmailAddress;
module.exports.sendPinEmail = sendPinEmail;
module.exports.sendConfirmationEmail = sendConfirmationEmail;