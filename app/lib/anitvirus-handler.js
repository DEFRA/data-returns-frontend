

var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
/*
 * @Name: isInfected
 * Scans a single file for viruses using http://www.clamav.net/
 * and https://github.com/kylefarris/clamscan
 * @param {string} filePath the full file path of a file
 * @returns {Promise}
 * always resolves with either a true if a virus is detected
 * or false if its clean
 */
module.exports.isInfected = function (filePath) {
  return new Promise(function (resolve, reject) {

    if (config.CSV.VIRUS_SCAN === true) {
      console.log('==> av is scanning ' + filePath);
      var clam = require('clamscan')(
        {
          remove_infected: false,
          quarantine_infected: false,
          scan_recursively: true,
          clamscan: {
            path: '/usr/bin/clamscan',
            scan_archives: true,
            active: true
          },
          clamdscan: {
            path: '/usr/bin/clamdscan',
            config_file: '/etc/clamd.conf',
            multiscan: true,
            reload_db: false,
            active: true
          },
          preference: 'clamscan'
        }
      );


      clam.is_infected(filePath, function (err, file, is_infected) {

        //is_infected ? is_infected : false;
        if (err) {
          console.log(err);
          resolve(false);
        }

        console.log('<== av scanning complete, infected: ' + is_infected);

        if (is_infected) {
          reject(true);
        } else {
          resolve(false);
        }

      });
    } else {
      resolve(false);
    }
  });
};

