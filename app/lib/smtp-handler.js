'use strict';

/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */
const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;
const smtp = config.get('smtp');

const util = require('util');
const drUtils = require('./utils');
const nodemailer = require('nodemailer');
const joi = require('joi');
const errorMsgs = require('./error-messages.js');
const hogan = require('hogan.js');
const cacheHandler = require('./cache-handler');
let compiledPinTemplate;
let compiledConfirmationEmailTemplate;
let compiledPinTextTemplate;
let compiledConfirmationEmailTextTemplate;
let sender = smtp.fromEmailAddress;
const path = require('path');

//Read the pin code template files
drUtils.readFile('../config/email-pin-code-template.html', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledPinTemplate = hogan.compile(result);
    }
});

drUtils.readFile('../config/email-pin-code-template.txt', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledPinTextTemplate = hogan.compile(result);
    }
});

//Read the confirmation email templates
drUtils.readFile('../config/email-confirmation-template.html', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledConfirmationEmailTemplate = hogan.compile(result);
    }
});

drUtils.readFile('../config/email-confirmation-template.txt', function (err, result) {
    if (err) {
        winston.error(err);
    } else {
        compiledConfirmationEmailTextTemplate = hogan.compile(result);
    }
});

/* used by Joi to validate the email address */
let schema = {
    address: joi.string().email({minDomainAtoms: 2})
};

/* checkLockOut
 * @param recipient the email address
 * @return A promise that resolves true if the user is not locked out
 * and rejects if the user is locked out
 */
let checkLockOut = function (recipient) {
    return new Promise(function (resolve, reject) {
        let key = recipient + '-lockedout';
        cacheHandler.getValue(key)
            .then(result => {
                resolve({locked: result !== null});
            })
            .catch(err => {
                reject(err);
            });
    });
};

/*
 * checkEmailLimit checks the number of times an email address has been used
 * @param recipient the emails address
 * @return a promise that resolves true if under the limit, rejects if over the limit
 * 
 */
let checkEmailLimit = function (recipient) {
    return new Promise(function (resolve, reject) {

        let key = recipient + '-count';

        cacheHandler.getValue(key)
            .then(function (result) {
                let expiry = drUtils.isInt(smtp.max_time_minutes) ? smtp.max_time_minutes * 60 : 600;

                if (result) {
                    result = parseInt(result);
                    result++;

                    cacheHandler.setValue(key, result, expiry);
                    if (result >= 10) {
                        key = recipient + '-lockedout';
                        expiry = smtp.lockout_time_seconds;
                        cacheHandler.setValue(key, true, expiry);
                        resolve({locked: true, attempts: result});
                    } else {
                        resolve({locked: false, attempts: result});
                    }
                } else {
                    // not in redis, either first time in or expired
                    cacheHandler.setValue(key, 1, expiry);
                    resolve({locked: false, attempts: 1});
                }
            }).catch(reject);
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
let validateEmailAddress = function (emailaddress) {
    return new Promise(function (resolve, reject) {
        checkLockOut(emailaddress).then(function (result) {
            if (result.locked) {
                //Locked out for an hour
                reject({
                    invalidEmailAddress: true,
                    errorCode: 2055
                });
            } else {
                return checkEmailLimit(emailaddress).then(function (result) {
                    if (result.locked) {
                        //too many attempts
                        reject({
                            invalidEmailAddress: true,
                            errorCode: 2055
                        });
                    } else {
                        let validationResult = joi.validate({'address': emailaddress}, schema);
                        if (validationResult.error) {
                            winston.info('\t email address is invalid: ' + JSON.stringify(validationResult));
                            reject({
                                invalidEmailAddress: true,
                                errorCode: 2050
                            });
                        } else {
                            winston.info('\t email address is valid');
                            resolve();
                        }
                    }
                });
            }
        }).catch(function (err) {
            winston.error(err);
            reject({
                errorCode: 3000
            });
        });
    });
};

/* Default Transport (SMTP Connection) */
let transporter = nodemailer.createTransport({
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
let sendPinEmail = function (recipient, newPin) {
    return new Promise(function (resolve, reject) {
        winston.info('==> sendPinEmail() ');
        let data = {
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

        let emailBody = compiledPinTemplate.render(data);
        let emailTextBody = compiledPinTextTemplate.render(data);

        /* Set per email options */
        let mailOptions = {
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
                reject(err);
                if (err.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
                    reject({
                        isUserError: false, //TODO decide what to do with smtp server errors
                        message: errorMsgs.SMTP.CONNECTION_REFUSED.message
                    });
                }
            } else if (info.response === smtp.success) {
                winston.info('<== Pin email sent successfully to ' + recipient);
                resolve(info);
            } else {
                winston.warn(`Unexpected response from email server: \r\n${util.inspect(info, {depth: null, colors: true})}`);
                resolve(info);
            }
        });
    });
};

let sendConfirmationEmail = function (metadata) {
    return new Promise(function (resolve, reject) {
        winston.info('==> sendConfirmationEmail() ');
        let date = new Date();
        let displayDate = drUtils.getFormattedDate(date);
        let time = drUtils.getFormattedTime(date);
        let templateData = {
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
        let emailBody = compiledConfirmationEmailTemplate.render(templateData);
        let emailTextBody = compiledConfirmationEmailTextTemplate.render(templateData);
        let mailOptions = {
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