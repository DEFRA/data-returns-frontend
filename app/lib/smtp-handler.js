'use strict';

/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */
const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;
const smtp = config.get('smtp');

var utils = require('./utils');
var nodemailer = require('nodemailer');
var joi = require('joi');
var errorMsgs = require('./error-messages.js');
var hogan = require('hogan.js');
var cacheHandler = require('./cache-handler');
var compiledPinTemplate;
var compiledConfirmationEmailTemplate;
var compiledPinTextTemplate;
var compiledConfirmationEmailTextTemplate;
var sender = smtp.fromEmailAddress;
const path = require('path');

//Read the pin code template files
utils.readFile('../config/email-pin-code-template.html', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledPinTemplate = hogan.compile(result);
    }
});

utils.readFile('../config/email-pin-code-template.txt', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledPinTextTemplate = hogan.compile(result);
    }
});

//Read the confirmation email templates
utils.readFile('../config/email-confirmation-template.html', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledConfirmationEmailTemplate = hogan.compile(result);
    }
});

utils.readFile('../config/email-confirmation-template.txt', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledConfirmationEmailTextTemplate = hogan.compile(result);
    }
});

/* used by Joi to validate the email address */
var schema = {
    address: joi.string().email({ minDomainAtoms : 2 })
};

/* checkLockOut
 * @param recipient the email address
 * @return A promise that resolves true if the user is not locked out
 * and rejects if the user is locked out
 */
var checkLockOut = function (recipient) {
    return new Promise(function (resolve, reject) {
        var key = recipient + '-lockedout';
        cacheHandler.getValue(key)
            .then(function (result) {
                if (result) {
                    // if a record exists they are locked out, the redis key will expire after an hour
                    reject(true);
                } else {
                    resolve();
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

        cacheHandler.getValue(key)
            .then(function (result) {

                var expiry = utils.isInt(smtp.max_time_minutes) ? smtp.max_time_minutes * 60 : 600;

                if (result) {
                    result = parseInt(result);
                    result++;

                    cacheHandler.setValue(key, result, expiry);
                    if (result >= 10) {
                        key = recipient + '-lockedout';
                        expiry = smtp.lockout_time_seconds;
                        cacheHandler.setValue(key, true, expiry);
                        reject({attempts: result});
                    } else {
                        resolve();
                    }
                } else {
                    // not in redis, either first time in or expired
                    cacheHandler.setValue(key, 1, expiry);
                    resolve();
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
            .then(function () {
                checkEmailLimit(emailaddress)
                    .then(function () {
                        winston.info('==> validateEmailAddress');
                        var result = joi.validate({'address': emailaddress}, schema);
                        if (result.error) {
                            winston.info('\t email address is invalid: ' + JSON.stringify(result));
                            reject({
                                invalidEmailAddress: true,
                                errorCode: 2050
                            });
                        } else {
                            winston.info('\t email address is valid');
                            resolve(true);
                        }
                    })
                    .catch(function (err) {
                        winston.info(err);
                        //too many attempts
                        reject({
                            invalidEmailAddress: true,
                            errorCode: 2055
                        });
                    });
            })
            .catch(function (err) {
                winston.info(err);
                //Locked out for an hour
                reject({
                    invalidEmailAddress: true,
                    errorCode: 2055
                });
            });
    });
};

/* Default Transport (SMTP Connection) */
var transporter = nodemailer.createTransport({
    host: smtp.useMailCatcher ? smtp.mailcatcher.host : smtp.host,
    port: smtp.useMailCatcher ? smtp.mailcatcher.port : smtp.port,
    ignoreTLS: smtp.useMailCatcher ? smtp.mailcatcher.ignoreTLS : smtp.ignoreTLS,
    auth: {
        user: smtp.username,
        pass: smtp.password
    }
}, {
    // default values for sendMail method
    from: smtp.useMailCatcher ? sender : 'datareturns@envage.co.uk'
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
        winston.info('==> sendPinEmail() ');

        console.log('path: ' + path.join(__dirname, '../../assets/images/' + smtp.govuklogo));

        var data = {
            pin: newPin,
            EnquiryEmail: smtp.support.email,
            UKPhone: smtp.support.UKPhone,
            PhoneFromAbroad: smtp.support.PhoneFromAbroad,
            MiniCommNumber: smtp.support.MiniCommNumber,
            govuklogo: smtp.govuklogo,
            ealogo: smtp.ealogo,
            crownLogo: smtp.crownLogo,
            useFooter: smtp.useFooter
        };

        var emailBody = compiledPinTemplate.render(data);
        var emailTextBody = compiledPinTextTemplate.render(data);

        /* Set per email options */
        var mailOptions = {
            from: sender,
            to: recipient,
            subject: newPin + ' ' + smtp.pinsubject,
            text: emailTextBody,
            html: emailBody
        };
        
        /* Send the email */
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                winston.error(err);
                if (err.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
                    reject({
                        isUserError: false, //TODO decide what to do with smtp server errors
                        message: errorMsgs.SMTP.CONNECTION_REFUSED.message
                    });
                }
            } else if (info.response === smtp.success) {
                winston.info('<== Pin email sent successfully to ' + recipient);
                resolve(true);
            }
        });
    });
};

var sendConfirmationEmail = function (metadata) {
    return new Promise(function (resolve, reject) {
        winston.info('==> sendConfirmationEmail() ');
        var date = new Date();
        var displayDate = utils.getFormattedDate(date);
        var time = utils.getFormattedTime(date);
        var templatedata = {
            DATE: displayDate,
            TIME: time,
            files: metadata.files,
            EnquiryEmail: smtp.support.email,
            UKPhone: smtp.support.UKPhone,
            PhoneFromAbroad: smtp.support.PhoneFromAbroad,
            MiniCommNumber: smtp.support.MiniCommNumber,
            govuklogo: smtp.govuklogo,
            ealogo: smtp.ealogo,
            crownLogo: smtp.crownLogo,
            useFooter: smtp.useFooter
        };
        var emailBody = compiledConfirmationEmailTemplate.render(templatedata);
        var emailTextBody = compiledConfirmationEmailTextTemplate.render(templatedata);
        var mailOptions = {
            from: sender,
            to: metadata.email,
            subject: smtp.confirmsubject,
            text: emailTextBody,
            html: emailBody
        };
        /* Send the email */
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                winston.error(err);
                if (err.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
                    reject({
                        isUserError: false, //TODO decide what to do with smtp server errors
                        message: errorMsgs.SMTP.CONNECTION_REFUSED.message
                    });
                }
            } else {
                winston.info(`Confirmation Email sent successfully to ${metadata.email}`, `smtp response: ${info}`);
                resolve(metadata.email);
            }
        });
    });
};

module.exports.validateEmailAddress = validateEmailAddress;
module.exports.sendPinEmail = sendPinEmail;
module.exports.sendConfirmationEmail = sendConfirmationEmail;