"use strict";
const winston = require("winston");
const fs = require('fs-extra');
const gaze = require('gaze');
const minimatch = require('minimatch');
const sass = require('node-sass');
const path = require('path');
const Compressor = require('node-minify');
const rootPath = path.resolve(__dirname, '../../');

const minifyTypes = {
    ".js": "uglifyjs",
    ".css": "clean-css"
};

const fsOps = {
    "empty": function (targetDir, onComplete) {
        fs.emptyDir(targetDir, function (err) {
            if (err) {
                return winston.error(`AssetManager: Unable to empty target directory ${targetDir}, reason ${err.message}`, err);
            }

            winston.info(`AssetManager: Emptied ${targetDir}`);
            if (onComplete) onComplete();
        });
    },
    "copy": function (sourcePath, targetPath, onComplete) {
        fs.copy(sourcePath, targetPath, {"clobber": true}, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to copy ${sourcePath} to ${targetPath}, reason ${err.message}`, err);
            }
            winston.info(`AssetManager: Copied ${sourcePath} to ${targetPath}`);
            if (onComplete) onComplete();
        });
    },
    "minify": function (sourcePath, targetPath, onComplete) {
        let ext = path.extname(sourcePath).toLowerCase();
        let minifyType = minifyTypes[ext] || null;

        if (minifyType !== null) {
            new Compressor.minify({
                type: minifyType,
                fileIn: sourcePath,
                fileOut: targetPath,
                callback: function (err) {
                    if (err) {
                        return winston.error(`AssetManager: Minification failed for ${sourcePath}, reason: ${err.message}`, err);
                    }
                    winston.info(`AssetManager: Minified ${sourcePath} to ${targetPath}`);
                    if (onComplete) onComplete();
                }
            });
        } else {
            winston.error(`AssetManager: Could not minify file with type ${ext} for path ${sourcePath}`);
        }
    },
    "delete": function (targetPath, onComplete) {
        fs.unlink(targetPath, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to delete ${targetPath}, reason ${err.message}`, err);
            }
            winston.info(`AssetManager: Deleted ${targetPath}`);
            if (onComplete) onComplete();
        });
    }
};

class AssetWatcher {
    constructor(pattern, sourceDir) {
        winston.info(`Registering asset directory ${sourceDir} for changes.`);
        let match = pattern || "**/*";

        // listen for subsequent changes
        gaze(match, {"cwd": sourceDir}, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to gaze at asset directory ${sourceDir}, reason ${err.message}`, err);
            }
            // On changed/added/deleted
            this.on('all', function (event, absolutePath) {
                try {
                    let relPath = path.relative(sourceDir, absolutePath);
                    winston.info(`AssetManager: Detected a change to ${relPath} inside ${sourceDir} (${event})`);
                    this.onChange(event, absolutePath, relPath);
                } catch (e) {
                    winston.error(`AssetManager: Change handler reported an error: ${e.message}`, e);
                }
            }.bind(this));
        });
    }

    /**
     *
     * @param event the type of change (added, changed, deleted)
     * @param absolutePath the absolute path to the file that was changed
     * @param relPath the relative path from the asset directory being watched
     */
    onChange() {
        // Override point
    }
}

class SassHandler extends AssetWatcher {
    /**
     *
     * @param pattern
     * @param sourceDir
     * @param mainFile
     * @param targetFile
     * @constructor
     */
    constructor(config) {
        super(config.pattern, config.sourceDir);
        this.config = config;
        this.mainFile = path.join(this.config.sourceDir, this.config.mainFile);
        this.outFile = path.join(this.config.targetDir, this.config.outFile);
        this.minifiedFile = path.join(this.config.targetDir, this.config.minifiedFile);
        this.onChange();
    }


    onChange() {
        winston.info(`AssetManager: Compiling SASS from ${this.config.mainFile} to ${this.config.outFile}`);
        let compile = this.compileSass.bind(this);
        fsOps.empty(this.config.targetDir, compile);
    }

    compileSass() {
        let onCompiled = function(err, result) {
            if (err) {
                return winston.error(`AssetManager: Failed to compile SASS from ${this.mainFile}, reason: ${err.message}`, err);
            }
            // No errors during the compilation, write this result on the disk
            fs.writeFile(this.outFile, result.css, function (fsErr) {
                if (fsErr) {
                    return winston.error(`AssetManager: Failed to write compiled SASS to ${this.outFile}, reason: ${fsErr.message}`, fsErr);
                }
                winston.info(`AssetManager: Compiled SASS from ${this.mainFile} to ${this.outFile}`);
                fsOps.minify(this.outFile, this.minifiedFile);
            }.bind(this));
        }.bind(this);

        sass.render({
            file: this.mainFile,
            outFile: this.outFile,
            outputStyle: 'expanded',
            sourceMap: true,
            includePaths: this.config.includePaths
        }, onCompiled);
    }
}

class PassthroughHandler extends AssetWatcher {
    constructor(config) {
        super(config.pattern, config.sourceDir);
        this.config = config;
        this.synchroniseAll();
    }

    synchroniseAll() {
        let syncOp = this.config.minify ? fsOps.minify : fsOps.copy;
        // Synchronise directories on startup
        fsOps.empty(this.config.targetDir, function () {
            fs.walk(this.config.sourceDir).on('data', function (item) {
                if (item.stats.isFile() && minimatch(item.path, this.config.pattern)) {
                    let relPath = path.relative(this.config.sourceDir, item.path);
                    let targetPath = path.join(this.config.targetDir, relPath);
                    syncOp(item.path, targetPath);
                }
            }.bind(this));
        }.bind(this));
    }

    onChange(event, absolutePath, relPath) {
        // Something changed in the source directory
        let targetPath = path.join(this.config.targetDir, relPath);
        if (event === "deleted") {
            fsOps.delete(targetPath);
        } else {
            let syncOp = this.config.minify ? fsOps.minify : fsOps.copy;
            syncOp(absolutePath, targetPath);
        }
    }
}

module.exports = {
    start: function () {
        new PassthroughHandler({
            "pattern": "**/*",
            "sourceDir": `${rootPath}/assets/images`,
            "targetDir": `${rootPath}/public/images`,
            "assetType": "image",
            "minify": false
        });

        new PassthroughHandler({
            "pattern": "**/*",
            "sourceDir": `${rootPath}/assets/resources`,
            "targetDir": `${rootPath}/public/resources`,
            "assetType": "resource",
            "minify": false
        });

        new PassthroughHandler({
            "pattern": "**/*.js",
            "sourceDir": `${rootPath}/assets/javascripts`,
            "targetDir": `${rootPath}/public/javascripts`,
            "assetType": "javascript",
            "minify": true
        });

        new SassHandler({
            "pattern": "**/*.scss",
            "sourceDir": `${rootPath}/assets/sass`,
            "targetDir": `${rootPath}/public/stylesheets`,
            "mainFile": "main.scss",
            "outFile": "main.css",
            "minifiedFile": "main-min.css",
            "includePaths": [
                `${rootPath}/assets/sass/front-end-toolkit`,
                `${rootPath}/assets/sass/dr-elements`,
                `${rootPath}/assets/sass/elements`,
                `${rootPath}/govuk_modules/govuk_template/assets/stylesheets`,
                `${rootPath}/govuk_modules/govuk_frontend_toolkit/stylesheets`
            ]
        });
    }
};