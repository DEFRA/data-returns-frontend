/*
 * Module to handle Redis calls
 * 
 * 
 */
'use strict';
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var ErrorMessages = require('./error-messages.js');

var redis = require('redis'),
  client = redis.createClient(config.redis.clientOptions);

module.exports = {
  /*
   * Gets a value from REDIS
   * @param key 
   * @returns a value based on the key via a promise
   */
  getValue: function (key) {

    return new Promise(function (resolve, reject) {
      key = key.replace(/"/g, '');
      console.log('==> cache-handler.getValue() key: ' + key);

      if (client && client.connected) {

        client.get(key, function (err, reply) {

          if (err) {
            console.error('<== cache-handler.getValue() error :' + err);
            reject({
              error: true,
              message: err.message
            });
          } else {
            console.log('<== cache-handler.getValue()');
            resolve(reply);
          }
        });
      } else {
        console.error('Error: cache-handler.getValue() ' + ErrorMessages.REDIS.NOT_CONNECTED);
        reject({
          error: true,
          message: ErrorMessages.REDIS.NOT_CONNECTED
        });

      }
    });
  },
  /*
   * Persists a new value for a given key
   * (no expiry)
   * @param key
   * @param value
   */

  setPersistedValue: function (key, value) {

    return new Promise(function (resolve, reject) {
      console.log('==> CacheHandler setPersistedValue() ', key);
      if (value) {
        client.set(key, JSON.stringify(value), function (err, res) {

          if (err) {

            console.error('<== CacheHandler setPersistedValue() error: ' + err);
            reject(err);
          } else {
            resolve(true);
          }

        });
      } else {
        resolve(true);
      }
    });
  },
  /*
   * Sets a new value for a given key
   * @param key
   * @param value
   */
  setValue: function (key, value, expiry) {

    return new Promise(function (resolve, reject) {
      console.log('==> CacheHandler setValue() ', key);
      if (value) {
        client.set(key, JSON.stringify(value), function (err, res) {

          if (err) {

            console.error('<== CacheHandler setValue() error: ' + err);
            reject(err);
          } else {
            console.log('<== CacheHandler setValue() redis response: ' + res);

            //auto delete any orphans after 24hrs
            var expireBy = expiry || ((60 * 60) * 24);
            client.EXPIRE(key, expireBy);

            resolve(true);

          }

        });
      } else {
        resolve(true);
      }
    });
  },
  delete: function (key) {

    return new Promise(function (resolve, reject) {
      //key = key.replace(/"/g, "");
      console.log('==> CacheHandler.delete(' + key + ')');

      client.DEL(key, function (err, res) {
        if (err) {
          console.error('\t CacheHandler.delete' + err, res);
          reject();
        } else {
          console.log('\t' + key + ' deleted');
        }

        resolve(true);
      });
      console.log('<== CacheHandler.delete()');
    });

  }
};

client.on('error', function (err) {
  console.error('Redis Error: ' + err);
});