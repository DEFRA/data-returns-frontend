const cacheHandler = require('../lib/cache-handler');

module.exports = {
    /* setFileSizeHighWaterMark
     * @param fileSizeBytes the size of the file
     * Add a record of the largest file size used in the service
     * @returns none
     */
    setFileSizeHighWaterMark: function (fileSizeBytes) {
        const key = 'data-returns-high-water-mark';

        cacheHandler.getValue(key)
            .then(function (data) {
                if (data) {
                    fileSizeBytes = parseInt(fileSizeBytes);
                    data = parseInt(data);

                    if (fileSizeBytes > data) {
                        cacheHandler.setPersistedValue(key, fileSizeBytes);
                    }
                } else {
                    cacheHandler.setPersistedValue(key, fileSizeBytes);
                }
            });
    }
};
