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
        //set up clamav config
        if (config && config.CSV && config.CSV.VIRUS_SCAN && config.CSV.VIRUS_SCAN === true) {
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
                        config_file: '/etc/clamav/clamd.conf',
                        multiscan: true,
                        reload_db: false,
                        active: true
                    },
                    preference: 'clamdscan'//'clamscan'
                }
            );

            // Do the av scan
            clam.is_infected(filePath, function (err, file, is_infected) {

                if (err) {
                    console.log(err);
                    if (config.CSV.ignoreScanFailure) {
                        return resolve(false);
                    } else {
                        return reject(false);
                    }
                }

                console.log('<== av scanning complete, infected: ' + is_infected);

                if (is_infected === true) {
                    return reject(true);
                } else if (is_infected === false) {
                    return resolve(false);
                }

            });
        } else {
            return resolve(false);
        }
    });
};

