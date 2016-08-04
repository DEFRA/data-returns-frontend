var fs = require('fs');
var gaze = require('gaze');
var sass = require('node-sass');
var path = require('path');
var rootPath = path.resolve(__dirname, '../../');
var compressor = require('node-minify');
const errbit = require("./errbit-handler");

var updateCSS = function (filepath) {
    console.log('Compiling ' + filepath + ' to CSS...');
    sass.render({
        file: rootPath + '/assets/sass/main.scss',
        outputStyle: 'expanded',
        sourceMap: true,
        includePaths: [rootPath + '/assets/sass/front-end-toolkit',
            rootPath + '/assets/sass/dr-elements',
            rootPath + '/assets/sass/elements',
            rootPath + 'govuk_modules/govuk_template/assets/stylesheets',
            rootPath + 'govuk_modules/govuk_frontend_toolkit/stylesheets']
    }, function (err, result) {
        if (!err) {
            // No errors during the compilation, write this result on the disk
            fs.writeFile(rootPath + '/public/stylesheets/main.css', result.css, function (err) {
                if (!err) {
                    console.log('\t /public/stylesheets/main.css has been updated');
                    new compressor.minify({
                        type: 'clean-css',
                        fileIn: 'public/stylesheets/main.css',
                        fileOut: 'public/stylesheets/main-min.css',
                        callback: function (err) {
                            if (err) {
                                errbit.notify(err);
                            } else {
                                console.log('\t /public/stylesheets/main-min.css has been updated');
                                console.log('Changes ready to view');
                            }
                        }
                    });
                }
            });
        } else {
            errbit.notify(err);
        }

    });
};

module.exports = {
    /*
     * Utility to watch for sass changes and compile to css
     * the css is also minified to a seperate css file
     *
     * @param {String} dir the directory to watch for changes
     * @returns none
     */
    startSASSWatch: function (dir) {

        // compile css at startup
        updateCSS(rootPath + '/assets/sass/main.scss');
        //listen for subsequent changes
        gaze(dir + '/**/*', function (err) {

            if (err) {
                errbit.notify(err);
            }

            // Get all watched files
            var watched = this.watched();

            if (watched) {
                // On file changed
                this.on('changed', function (filepath) {
                    updateCSS(filepath);
                });
                // On file added
                this.on('added', function (filepath) {
                    console.log(filepath + ' was added');
                });
                // On file deleted
                this.on('deleted', function (filepath) {
                    console.log(filepath + ' was deleted');
                });
            }
        });
    }
};
