
'use strict';
var config = require('../config/config.' + (process.env.NODE_ENV || 'development'));
var ErrorMessages = require('./error-messages.js');

var redis = require("redis"),
  client = redis.createClient(config.redis.clientOptions);

module.exports = {
  /*
   * Gets a value from REDIS
   * @param key 
   * @returns a value based on the key via a promise
   */
  getValue: function (key) {

    return new Promise(function (resolve, reject) {

      if (client && client.connected) {
        client.get(key, function (err, reply) {

          if (err) {
            reject({
              error: true,
              message: err.message
            });
          } else {
            resolve(reply);
          }
        });
      } else {
        reject({
          error: true,
          message: ErrorMessages.REDIS.NOT_CONNECTED
        });
        console.log('Error: cache-handler.getValue() ' + ErrorMessages.REDIS.NOT_CONNECTED);
      }
    });
  },
  /*
   * Sets a new value for a given key
   * @param key
   * @param value
   */
  setValue: function (key, value) {

    return new Promise(function (resolve, reject) {
      client.set(key, JSON.stringify(value));
      resolve(true);
    });
  },
  /*
   * Deletes a key/value pair based on the key via a promise
   * @param key
   */
  deleteKeyValuePair: function (key) {
    return new Promise(function (resolve, reject) {
      if (client && client.connected) {
        client.del(key);
        resolve(true);
      } else {
        reject(false);
      }
    });
  }
};

client.on('error', function (err) {
  console.log('Redis Error: ' + err);
});