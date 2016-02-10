'use strict';

/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */
var Utils = require('./utils');
var nodemailer = require('nodemailer');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var Joi = require('joi');
var errorMsgs = require('./error-messages.js');
var sender = config.smtp.fromEmailAddress;
var Hogan = require('hogan.js');
var emailTemplates = require('../config/configuration_email_templates');
var compiledPinTemplate;
var compiledConfirmationEmailTemplate;// = Hogan.compile(confirmationEmailTemplate);

//Read the pin code template file
Utils.readFile('../config/email-pin-code-template.html', function (err, result) {
  if (err) {
    console.error('Unable to read pin email template ' + err);
  } else {
    compiledPinTemplate = Hogan.compile(result);
  }
});

//Read the confirmation email template
Utils.readFile('../config/email-confirmation-template.html', function (err, result) {
  if (err) {
    console.error('Unable to read confirmation email template ' + err);
  } else {
    compiledConfirmationEmailTemplate = Hogan.compile(result);
  }
});

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
    console.log('==> validateEmailAddress');
    var result = Joi.validate({'address': emailaddress}, schema);

    if (result.error) {
      console.log('\t email address is invalid: ' + JSON.stringify(result));
      reject({
        invalidEmailAddress: true,
        message: errorMsgs.SMTP.INVALIDEMAILADDRESS
      });
    } else {
      console.log('\t email address is valid');
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
    console.log('==> sendPinEmail() ');
    var data = {
      pin: newPin,
      EnquiryEmail: config.smtp.support.email,
      UKPhone: config.smtp.support.UKPhone,
      PhoneFromAbroad: config.smtp.support.PhoneFromAbroad,
      MiniCommNumber: config.smtp.support.MiniCommNumber,
      govuklogo: 'http://dr-dev.envage.co.uk/public/images/govuk_logotype_email.png',
      ealogo: 'http://dr-dev.envage.co.uk/public/images/EAlogo.png',
      useFooter: config.smtp.useFooter
    };

    var emailBody = compiledPinTemplate.render(data);
    /* Set per email options */
    var mailOptions = {
      from: sender,
      to: recipient,
      subject: newPin + ' ' + config.smtp.pinsubject,
      //text: emailBody,
      html: emailBody
    };
    console.log(__dirname);
    /* Send the email */
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('\t error sending email ' + error);
        if (error.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
          reject({
            isUserError: false, //TODO decide what to do with smtp server errors
            message: errorMsgs.SMTP.CONNECTION_REFUSED.message
          });
        }
      } else if (info.response === config.smtp.success) {
        console.log('<== Pin email sent successfully to ' + recipient);
        resolve(true);
      }

    });
  });
};

var sendConfirmationEmail = function (userMail, filename) {

  return new Promise(function (resolve, reject) {
    console.log('==> sendConfirmationEmail() ');
    var date = new Date();
    var displayDate = Utils.getFormatedDate(date);
    var time = Utils.getFormatedTime(date);

    var data = {
      FILENAME: filename,
      DATE: displayDate,
      TIME: time,
      EnquiryEmail: config.smtp.support.email,
      UKPhone: config.smtp.support.UKPhone,
      PhoneFromAbroad: config.smtp.support.PhoneFromAbroad,
      MiniCommNumber: config.smtp.support.MiniCommNumber,
      govuklogo: 'http://dr-dev.envage.co.uk/public/images/govuk_logotype_email.png',
      ealogo: 'http://dr-dev.envage.co.uk/public/images/EAlogo.png',
      useFooter: config.smtp.useFooter
    };

    var emailBody = compiledConfirmationEmailTemplate.render(data);

    var mailOptions = {
      from: sender,
      to: userMail,
      subject: config.smtp.confirmsubject,
      //text: emailBody,
      html: emailBody
    };

    /* Send the email */
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('\t error sending confirmation email ' + error);
        if (error.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
          reject({
            isUserError: false, //TODO decide what to do with smtp server errors
            message: errorMsgs.SMTP.CONNECTION_REFUSED.message
          });
        }
      } else {
        console.log('<== Confirmation Email sent successfully to ' + userMail, 'smtp response:', info);
        resolve(userMail);
      }
    });
  });

};

module.exports.validateEmailAddress = validateEmailAddress;
module.exports.sendPinEmail = sendPinEmail;
module.exports.sendConfirmationEmail = sendConfirmationEmail;