'use strict';

const config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
const crypto = require('crypto');

function encodeHmac(key, data) {
  const func = crypto.createHmac(config.crypto.sha_function, key);
  const encoded = func.update(data);
  return encoded.digest('hex');
};

/*
 * To calculate the authorization header use the following scheme
 * adapted from AWS
 *
 * DateKey = HMAC-SHA256(secret access key, yyyymmdd)
 * SigningKey = HMAC-SHA256('DATARETURNS', DateKey)
 * Signiture = Hex(HMAC-SHA256(SigningKey, DataToSign))
 *
 */
module.exports.calculateAuthorizationHeader = function(dataToSign) {
  const today = new Date().toISOString().substr(0, 10).replace('-', '').replace('-', '');
  const dateKey = encodeHmac(config.crypto.secret_key, today);
  const signedData = encodeHmac(dateKey, dataToSign);

  return signedData;
};
