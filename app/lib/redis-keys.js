/**
 * Created by sam on 08/07/16.
 */


function newKey(keyId) {
    return {
        key: keyId,
        /**
         * Create a composite key based on a number of different identifiers
         *
         * @param keys an array of identifiers used to form the key, can be a string or an array of strings
         * @returns {string} the composite key to use for lookup
         */
        compositeKey: function (keys) {
            var lookup = keys;
            if (Array.isArray(keys)) {
                lookup = keys.join('_');
            }
            return lookup + '_' + keyId;
        }
    };
}

module.exports = {
    UPLOADED_FILES: newKey('Files'),
    USER_DATA: newKey('UserData'),
    CORRECTION_DETAIL: newKey('CorrectionDetail'),
    CLIENT_FILENAME: newKey('SourceName'),
    ERROR_PAGE_METADATA: newKey('error-page-metadata'),
    BACKEND_UPLOAD_RESULT: newKey('UploadResult'),
    LIST_METADATA: newKey('list-meta-data')
};