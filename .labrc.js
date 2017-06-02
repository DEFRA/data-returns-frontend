'use strict';

const reporters = new Map([
    ['html', 'reports/coverage.html'],
    ['junit', 'reports/coverage.xml'],
    ['console', 'stdout']
]);

module.exports = {
    'environment': 'local',
    'colors': true,
    'coverage': true,
    'coverage-path': 'app/',
    'lint': true,
    'leaks': false,
    'assert': 'chai',
    'reporter': Array.from(reporters.keys()),
    'output': Array.from(reporters.values()),
    'verbose': true,
    'debug': true
};
