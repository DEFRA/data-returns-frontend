'use strict';

const config = require('../lib/configuration-handler.js').Configuration;
const crypto = require('crypto');
const base64url = require('base64url');

function encodeHmac (key, data) {
    const func = crypto.createHmac(config.get('crypto.sha_function'), key);
    const encoded = func.update(data);
    return encoded.digest('hex');
}

/*
 * To calculate the authorization header use the following scheme
 * adapted from AWS
 *
 * DateKey = HMAC-SHA256(secret access key, yyyymmdd)
 * SigningKey = HMAC-SHA256('DATARETURNS', DateKey)
 * Signature = Hex(HMAC-SHA256(SigningKey, DataToSign))
 *
 */
module.exports.calculateAuthorizationHeader = function (dataToSign) {
    let signedData = '';
    if (config.get('api.key')) {
        const today = new Date().toISOString().substr(0, 10).replace('-', '').replace('-', '');
        const dateKey = encodeHmac(config.get('api.key'), today);
        signedData = encodeHmac(dateKey, dataToSign);
    }
    return signedData;
};

/*
 * To calculate a random string used for the CSRF token. 32 bytes is usually deemed sufficient.
 * We generate a base64 string from the random number
 */
module.exports.generateCSRFToken = function () {
    return base64url(crypto.randomBytes(256));
};
