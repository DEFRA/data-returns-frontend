/*
 * Module to handle Redis calls
 *
 *
 */
'use strict';

const config = require('../lib/configuration-handler.js').Configuration;
const winston = require('winston');

const redis = require('redis');
const client = redis.createClient(config.get('redis'));

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
        const expireBy = expiry || ((60 * 60) * 24);
        client.EXPIRE(key, expireBy);
    }
};

const self = module.exports = {
    connectionReady: function () {
        return new Promise(function (resolve, reject) {
            const interval = 500;
            let attempts = 0;
            const timer = setInterval(function () {
                winston.info('Checking redis connection state');
                if (client && client.connected) {
                    winston.info('Redis connection established');
                    clearInterval(timer);
                    resolve();
                } else if (attempts++ > 20) {
                    clearInterval(timer);
                    const err = new Error(`Redis connection not established within ${attempts * interval}ms, giving up`);
                    winston.error(err);
                    reject(err);
                }
            }, interval);
        });
    },

    /*
     * Gets a value from REDIS
     * @param key
     * @returns a value based on the key via a promise
     */
    getValue: function (key) {
        return new Promise(function (resolve, reject) {
            key = key.replace(/"/g, '');
            client.get(key, function (err, reply) {
                if (err) {
                    winston.error(err);
                    reject({
                        error: true,
                        message: err.message
                    });
                } else {
                    resolve(reply);
                }
            });
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
                        winston.error(err);
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
     * Increments the number stored at key by increment. If the key does not exist, it is set to 0 before performing the
     * operation. An error is returned if the key contains a value of the wrong type or contains a string that can not
     * be represented as integer.
     *
     * @param key the key whose value should be incremented
     * @param increment the amount to increment by, optional, defaults to 1
     */
    increment: function (key, increment) {
        return new Promise(function (resolve, reject) {
            if (!Number.isInteger(increment)) {
                increment = 1;
            }
            client.incrby(key, increment, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },

    /**
     * Delete all redis keys which match the given pattern
     *
     * @param pattern
     * @returns {Promise}
     */
    deleteKeys: function (pattern) {
        return new Promise((resolve, reject) => {
            client.keys(pattern, (err, keys) => {
                if (err) {
                    return reject(err);
                }

                if (keys.length > 0) {
                    client.del(keys, function (err) {
                        if (err) {
                            winston.error(err);
                            return reject(keys);
                        }

                        resolve(keys);
                    });
                } else {
                    // Nothing to delete
                    resolve();
                }
            });
        });
    },

    /**
     * Retrieve a JSON object for the specified key
     *
     * @param key
     * @returns {*}
     */
    getJsonValue: function (key) {
        return self.getValue(key).then(JSON.parse);
    },
    /*
     * Persists a new value for a given key
     * (no expiry)
     * @param key
     * @param value
     */
    setPersistedValue: function (key, value) {
        // Pass expiry: null to setValue to persist
        return self.setValue(key, value, null);
    },
    /**
     * Retrieve an array of json objects
     *
     * @param key the key used to lookup the array
     * @returns {Promise} resolved with the array on success. if no data can be retrieved then an empty array is returned
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
                        winston.error('Unable to parse data from redis JSON array', e);
                        resolve([]);
                    }
                }
            });
        });
    },
    /**
     * Ensures that an array is not empty
     *
     * @param key the key used to lookup the array
     * @returns {*|Promise} resolved with boolean true if there are uploads, false otherwise.  rejected on error
     */
    arrayNotEmpty: function (key) {
        return new Promise(function (resolve, reject) {
            client.llen(key, function (error, len) {
                if (error) {
                    reject(error);
                } else {
                    resolve(len > 0);
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
            const value = (typeof item === 'string') ? item : JSON.stringify(item);
            client.rpush(key, value, function (error) {
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
            const value = (typeof item === 'string') ? item : JSON.stringify(item);
            client.lrem(key, 0, value, function (error, removedCount) {
                if (error) reject(error); else resolve(removedCount);
            });
        });
    },
    delete: function (key) {
        return new Promise(function (resolve, reject) {
            client.DEL(key, function (err) {
                if (err) {
                    winston.error(err);
                    reject(err);
                }
                resolve(true);
            });
        });
    },
    setExpiry: setExpiry
};

client.on('error', winston.error);
