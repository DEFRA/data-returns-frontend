/*
 * Module to handle Redis calls
 * 
 * 
 */
'use strict';
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var errorMessages = require('./error-messages.js');
const errbit = require("./errbit-handler");
var redis = require('redis'),
    client = redis.createClient(config.redis.clientOptions);


/**
 * Set a key to expire.
 *
 * If the expiry parameter is explicitly set to null then expiry will NOT be set.
 * To set the default expiry period pass expire as undefined
 *
 * @param key the key for which to set expiry
 * @param expiry the expiry period
 */
const setExpiry = function (key, expiry) {
    if (expiry !== null) {
        var expireBy = expiry || ((60 * 60) * 24);
        client.EXPIRE(key, expireBy);
    }
};

module.exports = {
    /*
     * Gets a value from REDIS
     * @param key
     * @returns a value based on the key via a promise
     */
    getValue: function (key) {
        return new Promise(function (resolve, reject) {
            key = key.replace(/"/g, '');

            if (client && client.connected) {
                client.get(key, function (err, reply) {
                    if (err) {
                        errbit.notify(err);
                        reject({
                            error: true,
                            message: err.message
                        });
                    } else {
                        resolve(reply);
                    }
                });
            } else {
                errbit.notify(new Error(errorMessages.REDIS.NOT_CONNECTED));
                reject({
                    error: true,
                    message: errorMessages.REDIS.NOT_CONNECTED
                });
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
            if (value) {
                client.set(key, JSON.stringify(value), function (err) {
                    if (err) {
                        errbit.notify(err);
                        reject(err);
                    } else {
                        setExpiry(key, expiry);
                        resolve(true);
                    }

                });
            } else {
                resolve(true);
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
        // Pass expiry: null to setValue to persist
        return this.setValue(key, value, null);
    },
    /**
     * Retrieve an array of json objects
     *
     * @param key the key used to lookup the array
     * @returns {Promise} resolved with the array on success, rejected with the error/exception object on failure
     */
    arrayGet: function (key) {
        return new Promise(function (resolve, reject) {
            client.lrange(key, 0, -1, function (error, arr) {
                if (error) {
                    reject(error);
                } else {
                    try {
                        resolve(arr.map(JSON.parse));
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    },
    /**
     * Push an item onto an array for the given key.
     * The item is right-pushed onto the end of the array for the given key.  If no array exists for the given key
     * then it will be created.
     *
     * @param key the key used to address the array
     * @param item the item to add (may be any value, non-string values are JSON.stringified)
     * @returns {Promise} resolved with the newly stored item on success, rejected with the error/exception object on failure
     */
    arrayRPush: function (key, item) {
        return new Promise(function (resolve, reject) {
            let value = (typeof item === "string") ? item : JSON.stringify(item);
            client.rpush(key, value, function (error, arrayLength) {
                if (error) reject(error); else resolve(item);
                setExpiry(key);
            });
        });
    },
    /**
     * Remove an item from the array for the given key.

     * @param key the key used to address the array
     * @param item the item to remove (may be any value, non-string values are JSON.stringified).  Must match a stored item to remove anything.
     * @returns {Promise} resolved with the new array length on success, rejected with the error/exception object on failure
     */
    arrayRemove: function (key, item) {
        return new Promise(function (resolve, reject) {
            let value = (typeof item === "string") ? item : JSON.stringify(item);
            client.lrem(key, 0, value, function (error, removedCount) {
                if (error) reject(error); else resolve(removedCount);
            });
        });
    },
    delete: function (key) {
        return new Promise(function (resolve, reject) {
            client.DEL(key, function (err) {
                if (err) {
                    errbit.notify(err);
                    reject();
                }
                resolve(true);
            });
        });
    }
};

client.on('error', errbit.notify);