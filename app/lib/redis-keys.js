const lodash = require('lodash');
const winston = require('winston');

function newKey (keyId) {
    return {
        key: keyId,
        /**
         * Create a composite key based on a number of different identifiers
         *
         * @param keys an array of identifiers used to form the key, can be a string or an array of strings
         * @returns {Promise} resolved with the composite key to use for lookup, or rejected if any part of the key is null or undefined
         */
        compositeKey: function (keys) {
            return new Promise(function (resolve, reject) {
                if (lodash.isNil(keys)) {
                    const err = new Error('Rejecting use of null or undefined key');
                    winston.warn(err);
                    return reject(err);
                }
                let lookup = keys;
                if (Array.isArray(keys)) {
                    if (keys.find(lodash.isNil)) {
                        const err = new Error('Rejecting use of null or undefined composite key component');
                        winston.warn(err);
                        return reject(err);
                    }
                    lookup = keys.join('_');
                }
                winston.info('Using redis key ' + (lookup + '_' + keyId));
                resolve(lookup + '_' + keyId);
            });
        }
    };
}

module.exports = {
    UPLOADED_FILES: newKey('Files'),
    USER_DATA: newKey('UserData'),
    ERROR_PAGE_METADATA: newKey('error-page-metadata'),
    PIN_ATTEMPTS: newKey('PinAttempts'),
    LIST_METADATA: newKey('list-meta-data'),
    PRELOADED_SESSIONS: newKey('PreloadedSessions'),
    CSRF_TOKEN: newKey('csrf')
};
