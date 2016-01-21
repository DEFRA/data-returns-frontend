
'use strict';
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
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
      console.log('==> cache-handler.getValue() key: ' + key);

      if (client && client.connected) {

        client.get(key, function (err, reply) {

          if (err) {
            console.log('<== cache-handler.getValue() error :' + err);
            reject({
              error: true,
              message: err.message
            });
          } else {
            console.log('<== cache-handler.getValue() data: :' + reply);
            resolve(reply);
          }
        });
      } else {
        console.log('Error: cache-handler.getValue() ' + ErrorMessages.REDIS.NOT_CONNECTED);
        reject({
          error: true,
          message: ErrorMessages.REDIS.NOT_CONNECTED
        });

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
      console.log('==> CacheHandler setValue() ', key, value);
      client.set(key, JSON.stringify(value), function (err, res) {

        if (err) {
          console.log('<== CacheHandler setValue() error: ' + err);
          reject(err);
        } else {
          console.log('<== CacheHandler setValue() redis response: ' + res);
          //auto delete any orphans after 24hrs
          client.EXPIRE(key, (60 * 60) * 24);
          resolve(true);
        }

      });

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