'use strict';
/*
 *  An SMTP Helper module
 *  Note email configuration is per environment.
 */
const winston = require("winston");
const fs = require("fs");
const moment = require("moment");
const config = require('../lib/configuration-handler.js').Configuration;
const smtpConfig = config.get('smtp');

const nodeMailer = require('nodemailer');
const hogan = require('hogan.js');
const lodash = require('lodash');
const commonViewData = require("./common-view-data");
const joi = require('joi');
const cacheHandler = require('./cache-handler');
let sender = smtpConfig.fromEmailAddress;

const EMAIL_PIN_TEMPLATE_HTML = 'app/config/email-pin-code-template.html';
const EMAIL_PIN_TEMPLATE_TEXT = 'app/config/email-pin-code-template.txt';
const EMAIL_CONFIRMATION_TEMPLATE_HTML = 'app/config/email-confirmation-template.html';
const EMAIL_CONFIRMATION_TEMPLATE_TEXT = 'app/config/email-confirmation-template.txt';
let messageTemplates = {};

let templateCompiler = function (filename) {
    //Read the pin code template files
    fs.readFile(filename, 'utf8', function (err, result) {
        if (err) {
            winston.error(err);
        } else {
            messageTemplates[filename] = hogan.compile(result);
        }
    });
};
templateCompiler(EMAIL_PIN_TEMPLATE_HTML);
templateCompiler(EMAIL_PIN_TEMPLATE_TEXT);
templateCompiler(EMAIL_CONFIRMATION_TEMPLATE_HTML);
templateCompiler(EMAIL_CONFIRMATION_TEMPLATE_TEXT);

/* used by Joi to validate the email address */
let schema = {
    address: joi.string().email({minDomainAtoms: 2})
};

let lockout = {
    get: function (recipient) {
        return new Promise(function (resolve, reject) {
            let key = recipient + '-lockedout';
            cacheHandler.getValue(key).then(lock => resolve(lock !== null)).catch(reject);
        });
    },
    set: function (recipient, lock) {
        return new Promise(function (resolve, reject) {
            let key = recipient + '-lockedout';
            if (lock !== false) lock = true;
            cacheHandler.setValue(key, lock, smtpConfig.lockout_time_seconds).then(resolve).catch(reject);
        });
    }
};


/*
 * checkEmailLimit checks the number of times an email address has been used
 * @param recipient the emails address
 * @return a promise that resolves true if under the limit, rejects if over the limit
 * 
 */
let checkEmailLimit = function (recipient) {
    return new Promise(function (resolve, reject) {
        let emailUsageCountKey = recipient + '-count';
        cacheHandler.increment(emailUsageCountKey).then((usageCount) => {
            let expiry = Number.isInteger(smtpConfig.max_time_minutes) ? smtpConfig.max_time_minutes * 60 : 600;
            cacheHandler.setExpiry(emailUsageCountKey, expiry);
            let resp = {
                exceeded: usageCount >= 10,
                attempts: usageCount
            };
            if (resp.exceeded) {
                return lockout.set(recipient, true).then(() => resolve(resp));
            } else {
                resolve(resp);
            }
        }).catch(reject);
    });
};

/* Default Transport (SMTP Connection) */
let transporter = nodeMailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    ignoreTLS: smtpConfig.ignoreTLS,
    auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password
    }
}, {
    // default values for sendMail method
    from: sender || '"Environment Agency (no-reply)" noreply@environment-agency.gov.uk'
});

let sendMail = function (mailOptions, onSuccess, onFailure) {
    /* Send the email */
    transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            winston.error("A problem occurred when trying to send email.", err);
            if (onFailure) {
                onFailure(err);
            }
        } else {
            if (onSuccess) {
                onSuccess(info);
            }
        }
    });
};

module.exports = {
    /* validateEmailAddress
     * @param emailAddress - the email address to validate
     * @return Promise
     *
     * A non valid email causes a reject to occur
     * otherwise resolves to true
     */
    validateEmailAddress: function (emailAddress) {
        return new Promise(function (resolve, reject) {
            let validationResult = joi.validate({'address': emailAddress}, schema);
            if (validationResult.error) {
                winston.debug(`Email address is invalid: ${emailAddress}`);
                reject({
                    invalidEmailAddress: true,
                    errorCode: 2050
                });
            } else {
                lockout.get(emailAddress).then(function (locked) {
                    if (locked) {
                        //Locked out for an hour
                        reject({
                            invalidEmailAddress: true,
                            errorCode: 2055
                        });
                    } else {
                        return checkEmailLimit(emailAddress).then(function (result) {
                            if (result.exceeded) {
                                //too many attempts
                                reject({
                                    invalidEmailAddress: true,
                                    errorCode: 2055
                                });
                            } else {
                                resolve();
                            }
                        });
                    }
                }).catch(function (err) {
                    winston.error(err);
                    reject({
                        errorCode: 3000
                    });
                });
            }
        });
    },

    /* emails a recipient
     * @param recipient The recipients email address
     * @param the message to send
     * @returns a Promise
     * An error sent back from the smtp server causes a reject.
     * Rejects return an object with an error message
     * */
    sendPinEmail: function (recipient, newPin) {
        return new Promise(function (resolve, reject) {
            winston.debug(`Sending pin check email to ${recipient}`);
            let data = lodash.merge({
                pin: newPin
            }, commonViewData);

            /* Set per email options */
            let mailOptions = {
                from: sender,
                to: recipient,
                subject: newPin + ' ' + smtpConfig.pinsubject,
                text: messageTemplates[EMAIL_PIN_TEMPLATE_TEXT].render(data),
                html: messageTemplates[EMAIL_PIN_TEMPLATE_HTML].render(data)
            };

            /* Send the email */
            sendMail(mailOptions, resolve, reject);
        });
    },
    sendConfirmationEmail: function (metadata) {
        return new Promise(function (resolve, reject) {
            winston.debug(`Sending confirmation email to ${metadata.email}`);
            let data = lodash.merge({
                date: moment().format("DD-MM-YYYY"),
                time: moment().format("HH:mm"),
                files: metadata.files
            }, commonViewData);

            let mailOptions = {
                from: sender,
                to: metadata.email,
                subject: smtpConfig.confirmsubject,
                text: messageTemplates[EMAIL_CONFIRMATION_TEMPLATE_TEXT].render(data),
                html: messageTemplates[EMAIL_CONFIRMATION_TEMPLATE_HTML].render(data)
            };
            /* Send the email */
            sendMail(mailOptions, resolve, reject);
        });
    }
};
