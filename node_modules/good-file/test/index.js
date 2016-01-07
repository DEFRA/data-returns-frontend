// Load modules

var EventEmitter = require('events').EventEmitter;
var Fs = require('fs');
var Os = require('os');
var Path = require('path');
var Stream = require('stream');

var Code = require('code');
var Lab = require('lab');
var Bt = require('big-time');
var lab = exports.lab = Lab.script();
var Hoek = require('hoek');
var GoodFile = require('..');



// Declare internals

var internals = {
    tempDir: Os.tmpDir()
};

internals.removeLog = function (path) {

    if (Fs.existsSync(path)) {
        Fs.unlinkSync(path);
    }
};


internals.getLog = function (path, callback) {

    Fs.readFile(path, { encoding: 'utf8' }, function (error, data) {

        if (error) {
            return callback(error);
        }

        var results = JSON.parse('[' + data.replace(/\n/g, ',').slice(0, -1) + ']');
        callback(null, results);
    });
};


internals.readStream = function (done) {

    var result = new Stream.Readable({ objectMode: true });
    result._read = Hoek.ignore;

    if (typeof done === 'function') {
        result.once('end', done);
    }

    return result;
};

// Lab shortcuts

var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('GoodFile', function () {

    it('allows creation without using new', function (done) {

        var reporter = GoodFile({ log: '*' }, Hoek.uniqueFilename(internals.tempDir));
        expect(reporter._streams).to.exist();
        done();
    });

    it('allows creation using new', function (done) {

        var reporter = new GoodFile({ log: '*' }, Hoek.uniqueFilename(internals.tempDir));
        expect(reporter._streams).to.exist();
        done();
    });

    it('validates the options argument', function (done) {

        expect(function () {

            new GoodFile({ log: '*' });
        }).to.throw(Error, /value must be a (string|number)/);

        done();
    });

    it('will clear the timeout on the "stop" event', function (done) {

        var reporter = new GoodFile({ request: '*' }, {
            path: internals.tempDir,
            rotate: 'daily'
        });

        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._state.timeout).to.exist();

            read.push({ event: 'request', id: 1, timestamp: Date.now() });
            read.push(null);

            ee.emit('stop');

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(53);
                expect(reporter._streams.write._writableState.ended).to.be.true();
                expect(reporter._state.timeout._timeout._idleTimeout).to.equal(-1);

                internals.removeLog(reporter._streams.write.path);

                done();
            });
        });
    });

    it('does not clear the timeout if rotate has not been set', function (done) {

        var reporter = new GoodFile({ request: '*' }, {
            path: internals.tempDir
        });

        var ee = new EventEmitter();
        var read = internals.readStream();
        var called = false;

        var clear = Bt.clearTimeout;
        Bt.clearTimeout = function () {

            called = true;
        };

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._state.timeout).to.not.exist();

            read.push({ event: 'request', id: 1, timestamp: Date.now() });
            read.push(null);

            ee.emit('stop');
            Bt.clearTimeout = clear;

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(53);
                expect(reporter._streams.write._writableState.ended).to.be.true();

                internals.removeLog(reporter._streams.write.path);
                expect(called).to.be.false();

                done();
            });
        });
    });

    it('logs an error if one occurs on the write stream and tears down the pipeline', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var logError = console.error;
        var read = internals.readStream();

        console.error = function (value) {

            console.error = logError;
            expect(value.message).to.equal('mock error');
            internals.removeLog(reporter._streams.write.path);
            done();
        };

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            reporter._streams.write.emit('error', new Error('mock error'));
        });
    });

    it('properly sanitizes `format`, `prefix` and `extension`', function (done) {

        var sep = Path.sep;
        var reporter = new GoodFile({ log: '*' }, {
            path: internals.tempDir,
            format: 'Y' + sep + 'M' + sep,
            extension: 'foo' + sep + 'bar'
        });

        expect(reporter._settings.format).to.equal('Y-M-');
        expect(reporter._settings.extension).to.equal('.foo-bar');

        done();
    });

    it('writes to the current file and does not create a new one', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(error).to.not.exist();
                expect(reporter._streams.write.bytesWritten).to.equal(1260);

                internals.removeLog(reporter._streams.write.path);

                done();
            });

            for (var i = 0; i < 20; ++i) {
                read.push({ event: 'request', statusCode: 200, id: i, tag: 'my test ' + i });
            }

            read.push(null);
        });
    });

    it('handles circular references in objects', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();

            var data = {
                id: 1,
                event: 'request',
                timestamp: Date.now()
            };

            data._data = data;

            reporter._streams.write.on('finish', function () {

                internals.getLog(reporter._streams.write.path, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results.length).to.equal(1);
                    expect(results[0]._data).to.equal('[Circular ~]');

                    internals.removeLog(reporter._streams.write.path);

                    done();
                });
            });

            read.push(data);
            read.push(null);
        });
    });

    it('can handle a large number of events', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(907873);
                internals.removeLog(reporter._streams.write.path);

                done();
            });

            for (var i = 0; i <= 10000; i++) {
                read.push({ event: 'request', id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
            }
            read.push(null);
        });
    });

    it('will log events even after a delay', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(17134);
                internals.removeLog(reporter._streams.write.path);
                done();
            });

            for (var i = 0; i <= 100; i++) {
                read.push({ event: 'request', id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
            }

            setTimeout(function () {

                for (var j = 0; j <= 100; j++) {
                    read.push({ event: 'request', id: j, timestamp: Date.now(), value: 'inner iteration ' + j });
                }

                read.push(null);
            }, 500);
        });
    });

    it('rotates logs on the specified interval', function (done) {

        var reporter = new GoodFile({ request: '*' }, {
            path: internals.tempDir,
            rotate: 'daily',
            format: 'YY#DDDD#MM',
            extension: ''
        });

        var Moment = require('moment');

        var ee = new EventEmitter();
        var read = internals.readStream();

        var files = [];

        var getFile = reporter.getFile;

        reporter.getFile = function () {

            var result = getFile.call(this);

            files.push(result);

            return result;
        };

        // Moment function override for tests
        var oldMoment = Moment;
        var oldMomentUtc = Moment.utc;

        Moment.utc = function () {

            var returnval = oldMomentUtc();
            returnval.endOf = function () {

                return this.add(100, 'ms');
            };
            return returnval;
        };
        Moment.prototype = oldMoment.prototype;

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();

            for (var i = 0; i < 10; ++i) {

                read.push({ event: 'request', statusCode: 200, id: i, tag: 'my test 1 - ' + i });
            }

            setTimeout(function () {

                reporter._streams.write.on('finish', function () {

                    internals.getLog(files[0], function (err, fileOne) {

                        expect(err).to.not.exist();

                        internals.getLog(files[1], function (err, fileTwo) {

                            expect(err).to.not.exist();

                            var one = fileOne[0];
                            var two = fileTwo[0];

                            expect(fileOne).to.have.length(10);
                            expect(fileTwo).to.have.length(10);

                            expect(one).to.deep.equal({
                                event: 'request',
                                statusCode: 200,
                                id: 0,
                                tag: 'my test 1 - 0'
                            });
                            expect(two).to.deep.equal({
                                event: 'request',
                                statusCode: 200,
                                id: 0,
                                tag: 'my test 2 - 0'
                            });

                            for (var j = 0, jl = files.length; j < jl; ++j) {
                                expect(/good-file-\d+#\d+#\d+-[\w,\d]+$/g.test(files[j])).to.be.true();
                                internals.removeLog(files[j]);
                            }

                            done();
                        });
                    });
                });

                for (var k = 0; k < 10; ++k) {
                    read.push({ event: 'request', statusCode: 200, id: k, tag: 'my test 2 - ' + k });
                }

                read.push(null);
            }, 175);
        });
    });

    it('creates path to logs file if it does not exist', function (done) {

        var dir = Path.join(internals.tempDir, 'test');
        var file = Hoek.uniqueFilename(dir);

        Fs.stat(file, function (error) {

            // We expect an error to be thrown, because this directory should
            // not yet exist.
            expect(error).to.exist();

            var reporter = new GoodFile({ request: '*' }, file);
            var ee = new EventEmitter();
            var read = internals.readStream();

            reporter.init(read, ee, function (err) {

                expect(err).to.not.exist();
                expect(reporter._streams.write.path).to.equal(file);

                reporter._streams.write.on('finish', function () {

                    expect(reporter._streams.write.bytesWritten).to.equal(60);

                    // Be extra certain that the directory was created.
                    Fs.stat(file, function (err) {

                        expect(err).to.not.exist();

                        // Ensure that we have removed all files from this temp directory before we delete it.
                        Fs.readdirSync(dir).forEach(function (f) {

                            internals.removeLog(Path.join(dir, f));
                        });

                        Fs.rmdirSync(dir);

                        done();
                    });
                });

                read.push({ event: 'request', statusCode: 200, id: 0, tag: 'my test' });

                read.push(null);
            });
        });
    });

    describe('init()', function () {

        it('properly sets up the path and file information if the file name is specified', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodFile({ log: '*' }, file);
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();

                expect(reporter._streams.write.path).to.equal(file);

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });

        it('properly creates a random file if the directory option is specified', function (done) {

            var reporter = new GoodFile({ log: '*' }, { path: internals.tempDir });
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();
                expect(/good-file-\d+-.+.log/g.test(reporter._streams.write.path)).to.be.true();

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });

        it('uses the options passed via directory', function (done) {

            var reporter = new GoodFile({ log: '*' }, {
                path: internals.tempDir,
                extension: 'fun',
                prefix: 'ops-log',
                format: 'YY$DDDD'
            });
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();
                expect(/\/ops-log-\d{2}\$\d{3}-.+.fun/g.test(reporter._streams.write.path)).to.be.true();

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });
    });

});
