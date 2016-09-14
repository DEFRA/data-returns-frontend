"use strict";

const config = require('../lib/configuration-handler.js').Configuration;
const winston = require("winston");

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
        if (config.get('csv.virus_scan')) {
            winston.info('==> av is scanning ' + filePath);

            let handleError = function(err) {
                if (config.get('csv.ignoreScanFailure')) {
                    winston.warn(`Virus scanning failed but set to ignore failures.`);
                    return resolve(false);
                } else {
                    winston.error(`Virus scanning failed with error: ${err.message}`, err);
                    return reject(false);
                }
            };

            try {
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
                        return handleError(err);
                    }

                    winston.info('<== av scanning complete, infected: ' + is_infected);
                    if (is_infected === true) {
                        return reject(true);
                    } else if (is_infected === false) {
                        return resolve(false);
                    }

                });
            } catch (err) {
                return handleError(err);
            }
        } else {
            return resolve(false);
        }
    });
};

