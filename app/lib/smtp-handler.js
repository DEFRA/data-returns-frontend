'use strict';

/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */
var utils = require('./utils');
var nodemailer = require('nodemailer');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var joi = require('joi');
var errorMsgs = require('./error-messages.js');
var sender = config.smtp.fromEmailAddress;
var hogan = require('hogan.js');
var cacheHandler = require('./cache-handler');
var compiledPinTemplate;
var compiledConfirmationEmailTemplate;
var compiledPinTextTemplate;
var compiledConfirmationEmailTextTemplate;
var _ = require('lodash');
const errbit = require("./errbit-handler");


//Read the pin code template files
utils.readFile('../config/email-pin-code-template.html', function (err, result) {
    if (err) {
        errbit.notify(err);
    } else {
        compiledPinTemplate = hogan.compile(result);
    }
});

utils.readFile('../config/email-pin-code-template.txt', function (err, result) {
    if (err) {
        errbit.notify(err);
    } else {
        compiledPinTextTemplate = hogan.compile(result);
    }
});

//Read the confirmation email templates
utils.readFile('../config/email-confirmation-template.html', function (err, result) {
    if (err) {
        errbit.notify(err);
    } else {
        compiledConfirmationEmailTemplate = hogan.compile(result);
    }
});

utils.readFile('../config/email-confirmation-template.txt', function (err, result) {
    if (err) {
        errbit.notify(err);
    } else {
        compiledConfirmationEmailTextTemplate = hogan.compile(result);
    }
});

/* used by Joi to validate the email address */
var schema = {
    address: joi.string().email()
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

        //Check if email address is white listed for test purposes
        // Do not lock out if whitelisted
        var whitelist = config.smtp.email_address_white_list;
        var index = _.indexOf(whitelist, recipient);

        if (index !== -1) {
            return resolve();
        }

        cacheHandler.getValue(key)
            .then(function (result) {

                var expiry = config.smtp.max_time_minutes ? (60 * config.smtp.max_time_minutes) : 600;// default to 10 minutes

                if (result) {
                    result = parseInt(result);
                    result++;

                    cacheHandler.setValue(key, result, expiry);
                    if (result >= 10) {
                        key = recipient + '-lockedout';
                        expiry = config.smtp.lockout_time_seconds;
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
                        console.log('==> validateEmailAddress');
                        var result = joi.validate({'address': emailaddress}, schema);
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
                        console.log(err);
                        //too many attempts
                        reject({
                            invalidEmailAddress: true,
                            errorCode: 2055
                        });
                    });
            })
            .catch(function (err) {
                console.log(err);
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
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                errbit.notify(err);
                if (err.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
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


var sendConfirmationEmail = function (metadata) {

    return new Promise(function (resolve, reject) {
        console.log('==> sendConfirmationEmail() ');
        var date = new Date();
        var displayDate = utils.getFormatedDate(date);
        var time = utils.getFormatedTime(date);
        var templatedata = {
            DATE: displayDate,
            TIME: time,
            files: metadata.files,
            EnquiryEmail: config.smtp.support.email,
            UKPhone: config.smtp.support.UKPhone,
            PhoneFromAbroad: config.smtp.support.PhoneFromAbroad,
            MiniCommNumber: config.smtp.support.MiniCommNumber,
            govuklogo: config.smtp.govuklogo,
            ealogo: config.smtp.ealogo,
            crownLogo: config.smtp.crownLogo,
            useFooter: config.smtp.useFooter
        };
        var emailBody = compiledConfirmationEmailTemplate.render(templatedata);
        var emailTextBody = compiledConfirmationEmailTextTemplate.render(templatedata);
        var mailOptions = {
            from: sender,
            to: metadata.email,
            subject: config.smtp.confirmsubject,
            text: emailTextBody,
            html: emailBody
        };
        /* Send the email */
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                errbit.notify(err);
                if (err.code === errorMsgs.SMTP.CONNECTION_REFUSED.code) {
                    reject({
                        isUserError: false, //TODO decide what to do with smtp server errors
                        message: errorMsgs.SMTP.CONNECTION_REFUSED.message
                    });
                }
            } else {
                console.log(`Confirmation Email sent successfully to ${metadata.email}`, `smtp response: ${info}`);
                resolve(metadata.email);
            }
        });
    });
};
module.exports.validateEmailAddress = validateEmailAddress;
module.exports.sendPinEmail = sendPinEmail;
module.exports.sendConfirmationEmail = sendConfirmationEmail;