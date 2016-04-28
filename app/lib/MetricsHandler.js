
var CacheHandler = require('../lib/cache-handler');


module.exports = {
  setStartDateTime: function () {

    return new Promise(function (resolve, reject) {
      var d = new Date();
    });
  },
  setEndDateTime: function () {

    return new Promise(function (resolve, reject) {
      var d = new Date();
    });
  },
  /* setFileSizeHighWaterMark
   * @param fileSizeBytes the size of the file
   * Add a record of the largest file size used in the service
   * @returns none
   */
  setFileSizeHighWaterMark: function (fileSizeBytes) {
    var key = 'data-returns-high-water-mark';

    CacheHandler.getValue(key)
      .then(function (data) {
        if (data) {
          fileSizeBytes = parseInt(fileSizeBytes);
          data = parseInt(data);

          if (fileSizeBytes > data) {
            CacheHandler.setPersistedValue(key, fileSizeBytes);
          }

        } else {
          CacheHandler.setPersistedValue(key, fileSizeBytes);
        }

      });
  },
  getFileSizeHighWaterMark: function (fileSizeBytes) {
    var key = 'data-returns-high-water-mark';
    CacheHandler.get(key);
  }


};