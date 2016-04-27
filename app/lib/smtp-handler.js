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
var CacheHandler = require('./cache-handler');
var compiledPinTemplate;
var compiledConfirmationEmailTemplate;
var compiledPinTextTemplate;
var compiledConfirmationEmailTextTemplate;


//Read the pin code template files
Utils.readFile('../config/email-pin-code-template.html', function (err, result) {
  if (err) {
    console.error('Unable to read pin email template ' + err);
  } else {
    compiledPinTemplate = Hogan.compile(result);
  }
});

Utils.readFile('../config/email-pin-code-template.txt', function (err, result) {
  if (err) {
    console.error('Unable to read pin email text template ' + err);
  } else {
    compiledPinTextTemplate = Hogan.compile(result);
  }
});

//Read the confirmation email templates
Utils.readFile('../config/email-confirmation-template.html', function (err, result) {
  if (err) {
    console.error('Unable to read confirmation email template ' + err);
  } else {
    compiledConfirmationEmailTemplate = Hogan.compile(result);
  }
});

Utils.readFile('../config/email-confirmation-template.txt', function (err, result) {
  if (err) {
    console.error('Unable to read confirmation email template ' + err);
  } else {
    compiledConfirmationEmailTextTemplate = Hogan.compile(result);
  }
});

/* used by Joi to validate the email address */
var schema = {
  address: Joi.string().email()
};

/* checkLockOut
 * @param recipient the email address
 * @return A promise that resolves true if the user is not locked out
 * and rejects if the user is locked out
 */
var checkLockOut = function (recipient) {

  return new Promise(function (resolve, reject) {

    var key = recipient + '-lockedout';
    CacheHandler.getValue(key)
      .then(function (result) {
        if (result) {
          // if a record exists they are locked out, the redis key will expire after an hour
          reject(true);
        } else {
          resolve(false);
        }
      });
  });
};


/*
 * checkEmailLimit checks the number of times an email address has been used
 * @param recipient the emails address
 * @return a promise that resolves true if under the limit, rejects if over the limit
 * 
 */
var checkEmailLimit = function (recipient) {

  return new Promise(function (resolve, reject) {

    var key = recipient + '-count';

    CacheHandler.getValue(key)
      .then(function (result) {
        if (result) {
          result = parseInt(result);
          result++;
          var expiry = config.smtp.max_time_minutes ? (60 * config.smtp.max_time_minutes) : 600;// default to 10 minutes
          CacheHandler.setValue(key, result, expiry);
          if (result >= 10) {
            key = recipient + '-lockedout';
            expiry = (60 * 60);
            CacheHandler.setValue(key, true, expiry);
            reject({attempts: result});
          } else {
            resolve(true);
          }
        } else {
          // not in redis, either first time in or expired
          var expiry = config.smtp.max_time_minutes ? (60 * config.smtp.max_time_minutes) : 600;
          CacheHandler.setValue(key, 1, expiry);
          resolve(true);
        }
      });
  });
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

    checkLockOut(emailaddress)
      .then(function (result) {
        checkEmailLimit(emailaddress)
          .then(function (result) {
            console.log('==> validateEmailAddress');
            var result = Joi.validate({'address': emailaddress}, schema);
            if (result.error) {
              console.log('\t email address is invalid: ' + JSON.stringify(result));
              reject({
                invalidEmailAddress: true,
                errorCode: 2050
              });
            } else {
              console.log('\t email address is valid');
              resolve(true);
            }
          })
          .catch(function (err) {
            //too many attempts
            reject({
              invalidEmailAddress: true,
              errorCode: 2055
            });
          });
      })
      .catch(function (err) {
        //Locked out for an hour
        reject({
          invalidEmailAddress: true,
          errorCode: 2055
        });
      });
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
//config.smtp.max_limit = 10;
//config.smtp.max_time_minutes = 10;





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
      govuklogo: config.smtp.govuklogo, //'http://dr-dev.envage.co.uk/public/images/govuk_logotype_email.png',
      ealogo: config.smtp.ealogo, //'http://dr-dev.envage.co.uk/public/images/EAlogo.png',
      crownLogo: config.smtp.crownLogo,
      useFooter: config.smtp.useFooter
    };
    var emailBody = compiledPinTemplate.render(data);
    var emailTextBody = compiledPinTextTemplate.render(data);
    /* Set per email options */
    var mailOptions = {
      from: sender,
      to: recipient,
      subject: newPin + ' ' + config.smtp.pinsubject,
      text: emailTextBody,
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
      govuklogo: config.smtp.govuklogo, //'http://dr-dev.envage.co.uk/public/images/govuk_logotype_email.png',
      ealogo: config.smtp.ealogo, //'http://dr-dev.envage.co.uk/public/images/EAlogo.png',
      crownLogo: config.smtp.crownLogo,
      useFooter: config.smtp.useFooter
    };
    var emailBody = compiledConfirmationEmailTemplate.render(data);
    var emailTextBody = compiledConfirmationEmailTextTemplate.render(data);
    var mailOptions = {
      from: sender,
      to: userMail,
      subject: config.smtp.confirmsubject,
      text: emailTextBody,
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