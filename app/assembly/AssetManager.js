"use strict";
const winston = require("winston");
const fs = require('fs-extra');
const klaw = require('klaw');
const gaze = require('gaze');
const minimatch = require('minimatch');
const sass = require('node-sass');
const path = require('path');
const compressor = require('node-minify');
const rootPath = path.resolve(__dirname, '../../');

const minifyTypes = {
    ".js": {
        compressor: "uglifyjs",
        options: {
            // Mangling causes problems for IE8
            'mangle': false,
            'compress': false,
            'support-ie8': true
        }
    },
    ".css": {
        compressor: "clean-css",
        options: {
            compatibility: "ie8"
        }
    }
};

const minifyIgnorePatterns = [
    // Pre-minified versions of these libraries already provided
    /^jquery-1\.12\.4.*/,
    /^jquery\.mark.*/
];

/**
 * AssetManager base class
 */
class AssetManager {
    constructor(config) {
        this.config = config;

        winston.info(`Registering asset directory ${config.sourceDir} for changes.`);
        let match = config.pattern || "**/*";

        let watcher = this;
        // listen for subsequent changes
        gaze(match, {"cwd": config.sourceDir}, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to gaze at asset directory ${config.sourceDir}, reason ${err.message}`, err);
            }
            // On changed/added/deleted
            this.on('all', function (event, absolutePath) {
                try {
                    let relPath = path.relative(config.sourceDir, absolutePath);
                    winston.info(`AssetManager: Detected a change to ${relPath} inside ${config.sourceDir} (${event})`);
                    this.onChange(event, absolutePath, relPath);
                } catch (e) {
                    winston.error(`AssetManager: Change handler reported an error: ${e.message}`, e);
                }
            }.bind(watcher));
        });
    }

    /**
     * Empty the specified directory (recursively delete all contents)
     *
     * @param targetDir the directory to empty
     * @param onComplete optional completion callback
     */
    static empty(targetDir, onComplete) {
        fs.emptyDir(targetDir, function (err) {
            if (err) {
                return winston.error(`AssetManager: Unable to empty target directory ${targetDir}, reason ${err.message}`, err);
            }

            winston.info(`AssetManager: Emptied ${targetDir}`);
            if (onComplete) onComplete();
        });
    }

    /**
     * Copy a resource from sourcePath to targetPath
     *
     * @param sourcePath the source file/directory for the copy operation
     * @param targetPath the target file/directory for the copy operation
     * @param onComplete optional completion callback
     */
    static copy(sourcePath, targetPath, onComplete) {
        fs.copy(sourcePath, targetPath, {"clobber": true}, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to copy ${sourcePath} to ${targetPath}, reason ${err.message}`, err);
            }
            winston.info(`AssetManager: Copied ${sourcePath} to ${targetPath}`);
            if (onComplete) onComplete();
        });
    }

    /**
     * Minify the sourcePath resource and output the minified content to targetPath
     *
     * @param sourcePath the source file/directory for the minify operation
     * @param targetPath the target file/directory for the minify operation
     * @param onComplete optional completion callback
     */
    static minify(sourcePath, targetPath, onComplete) {
        let ext = path.extname(sourcePath).toLowerCase();
        let minifyType = minifyTypes[ext] || null;

        if (minifyType !== null) {
            compressor.minify({
                compressor: minifyType.compressor,
                input: sourcePath,
                output: targetPath,
                options: minifyType.options,
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
    }

    /**
     * Delete the file/directory specified by targetPath
     *
     * @param targetPath the file/directory to be deleted
     * @param onComplete optional completion callback
     */
    static delete(targetPath, onComplete) {
        fs.unlink(targetPath, function (err) {
            if (err) {
                return winston.error(`AssetManager: Failed to delete ${targetPath}, reason ${err.message}`, err);
            }
            winston.info(`AssetManager: Deleted ${targetPath}`);
            if (onComplete) onComplete();
        });
    }


    /**
     * The onChange method is an override point.  This method is called whenever the AssetManager detects a change
     * in one of the watched asset directories.
     *
     * @param event the type of change (added, changed, deleted)
     * @param absolutePath the absolute path to the file that was changed
     * @param relPath the relative path from the asset directory being watched
     */
    onChange() {
        // Override point
    }
}

/**
 * SassHandler implementation of the AssetManager
 */
class SassHandler extends AssetManager {
    constructor(config) {
        super(config);
        this.mainFile = path.join(this.config.sourceDir, this.config.mainFile);
        this.outFile = path.join(this.config.targetDir, this.config.outFile);
        this.minifiedFile = path.join(this.config.targetDir, this.config.minifiedFile);
        this.onChange();
    }

    /**
     * Fired when a change to any SASS asset occurs
     */
    onChange() {
        // When a change to a SASS asset occurs we need to delete the last output and recompile all SASS
        AssetManager.empty(this.config.targetDir, this.compileSass.bind(this));
    }

    /**
     * Recompile the output CSS from the SASS source.
     */
    compileSass() {
        let onCompiled = function (err, result) {
            if (err) {
                return winston.error(`AssetManager: Failed to compile SASS from ${this.mainFile}, reason: ${err.message}`, err);
            }
            // No errors during the compilation, write this result on the disk
            fs.writeFile(this.outFile, result.css, function (fsErr) {
                if (fsErr) {
                    return winston.error(`AssetManager: Failed to write compiled SASS to ${this.outFile}, reason: ${fsErr.message}`, fsErr);
                }
                winston.info(`AssetManager: Compiled SASS from ${this.mainFile} to ${this.outFile}`);
                // Create a minified version of the CSS output
                AssetManager.minify(this.outFile, this.minifiedFile);
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

/**
 * PassthroughHandler implementation of the AssetManagfer
 *
 * This implementation passes resources through from the source asset folder to the public folder, optionally
 * running minification on the assets as they are passed through
 */
class PassthroughHandler extends AssetManager {
    constructor(config) {
        super(config);
        this.synchroniseAll();
    }

    /**
     * Synchronise all assets between the source and target folders
     */
    synchroniseAll() {
        // Synchronise directories on startup
        AssetManager.empty(this.config.targetDir, function () {
            klaw(this.config.sourceDir).on('data', function (item) {
                if (item.stats.isFile() && minimatch(item.path, this.config.pattern)) {
                    let relPath = path.relative(this.config.sourceDir, item.path);
                    let targetPath = path.join(this.config.targetDir, relPath);
                    this.synchroniseFile(item.path, targetPath);
                }
            }.bind(this));
        }.bind(this));
    }

    /**
     * Fired when a change to a source asset is detected
     */
    onChange(event, absolutePath, relPath) {
        // Something changed in the source directory
        let targetPath = path.join(this.config.targetDir, relPath);
        if (event === "deleted") {
            AssetManager.delete(targetPath);
        } else {
            this.synchroniseFile(absolutePath, targetPath);
        }
    }

    /**
     * Synchronise a file between the source and target folders
     *
     * Determines whether to use a minify or copy operation.
     */
    synchroniseFile(source, target) {
        let filename = path.basename(source);
        let minifyIgnore = !!minifyIgnorePatterns.find(ptn => filename.match(ptn));
        let syncOp = this.config.minify && !minifyIgnore ? AssetManager.minify : AssetManager.copy;
        return syncOp(source, target);
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
                `${rootPath}/assets/sass/dr-elements`,
                `${rootPath}/node_modules/govuk-elements-sass/public/sass`,
                `${rootPath}/node_modules/govuk_frontend_toolkit/stylesheets`
            ]
        });
    }
};