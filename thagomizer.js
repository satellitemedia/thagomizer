function HttpCheck()
{
    const cli = require('cli'),
        log = require('npmlog'),
        moment = require('moment'),
        fs = require('fs'),
        async = require('async'),
        self = this;

    this._options = null;
    this._tests = null;
    this._testCounter = 0;
    this._output = null;

    this.getOption = function (name) {
        if (null === this._options) {
            self._options = cli.parse({
                clients: [ 'c', 'The number of concurrent clients, defaults to 1', 'number', 1 ],
                tries: [ 't', 'The number of tries per client, defaults to 10, max 10000', 'number', 10 ],
                delay: [ 'd', 'Repeats the check after the delay in seconds, requires --until', 'number', 0 ],
                until: [ 'u', 'Halt the script when the time is reached', 'string', null ],
                post: [ false, 'Content of the post request, placeholders for CSV input are in the form: %index%', 'string', null ],
                'post-type': [ false, 'Content type of the data', 'string', 'application/x-www-form-urlencoded' ],
                url: [ 'U', 'The URL to hit, placeholders for CSV input are in the form: %index%', 'string', null ],
                headers: [ false, 'Headers to send', 'string', null ],
                tests: [ false, 'CSV file with test data, requires --post', 'file', null ],
                expect: [ 'e', 'A RegExp to check the response against', 'string', null ],
                valid: [ false, 'A RegExp to check if the response is valid', 'string', null],
                output: [ 'o', 'The output file', 'file', null ],
                'log-level': [ false, 'The log level', 'string', 'info' ]
            });

            log.level = self.getOption('log-level');
        }

        if ('undefined' !== self._options[name]) {
            return self._options[name];
        }

        return null;
    };

    function loadTests(callback) {
        const csvParse = require('csv-parse');
        fs.readFile(self.getOption('tests'), 'utf8', function (err, data) {
            if (err) {
                callback(err);
                return;
            }

            csvParse(data, function (err, objects) {
                if (err) {
                    callback(err);
                    return;
                }

                self.log('Loaded ' + objects.length + ' tests', 'tests');
                callback(null, objects);
            });
        });
    }

    this.getNextTest = function () {
        if (0 === self._tests.length) {
            return [];
        }

        var test = self._tests[self._testCounter % self._tests.length];
        self._testCounter++;
        return test;
    };

    function doRun() {
        if (null !== self.getOption('until')) {
            const until = moment(self.getOption('until')),
                delay = self.getOption('delay');

            var runner = function (repeater) {
                return function () {
                    self.runOnce(repeater);
                };
            };

            var repeater = function (err) {
                if (err) {
                    self.log('An error occurred: ' + err.message, 'ab', 'error');
                    return;
                }

                self.log('Sleeping for ' + delay + ' seconds');
                setTimeout(runner(repeater), delay * 1000);
            };

            self.log('Repeating the test until: ' + until.format());
            self.runOnce(repeater);
        } else {
            self.runOnce(function (err) {
                if (err) {
                    self.log('An error occurred: ' + err.message, 'ab', 'error');
                }
            });
        }
    }

    function prepareOutput(cb) {
        const path = self.getOption('output');
        try {
            fs.accessSync(path);
            fs.open(path, 'a', cb);
        } catch (err) {
            fs.open(path, 'a', function (err, fd) {
                if (err) {
                    cb(err);
                    return;
                }

                fs.writeSync(fd, ['timestamp', 'status', 'connect', 'processing', 'waiting', 'total', 'response', 'completed/failed'].join(',') + '\n');
                cb(null, fd);
            });
        }
    }

    this.run = function () {
        if (null === self.getOption('url')) {
            self.log('Ypu must specify a URL to hit', null, 'error');
            return;
        }

        async.series({
            tests: function(cb) {
                if (null === self.getOption('tests')) {
                    cb(null, []);
                    return;
                }

                self.log('Loading test data from: ' + self.getOption('tests'), 'tests');
                loadTests(cb);
            },
            output: function (cb) {
                if (null === self.getOption('output')) {
                    cb(null, null);
                    return;
                }

                self.log('Saving results to: ' + self.getOption('output'), 'output');
                prepareOutput(cb);
            }
        }, function (err, results) {
            if (err) {
                self.log('An error occurred: ' + err.message, null, 'error');
                return;
            }

            self._tests = results.tests;
            self._output = results.output;
            doRun();
        });
    };

    function logToCsv(results) {
        return function (cb) {
            var csvStringify = require('csv-stringify');
            csvStringify(results, function(err, output) {
                if (err) {
                    cb(err);
                    return;
                }

                fs.writeSync(self._output, output, 'utf8');
                cb();
            });
        };
    }

    function parseOutput(output, clients, count) {
        const content = self.getOption('expect') || '',
            expected = "\nHTTP\\/1\\.1 \\d{3} .+(?:.|\n|\r)+?(\r\n|\n){2}" + content.replace(/\\n/g, '(?:\r\n|\n)'),
            regex = new RegExp(expected, 'gm'),
            results = { requests: [], timing: { connect: null, processing: null, waiting: null, total: null } };

        var connect = output.match(/\nConnect:\s+\d+\s+(\d+)\s/);
        results.timing.connect = connect && connect[1] ? connect[1] : null;
        var processing = output.match(/\nProcessing:\s+\d+\s+(\d+)\s/);
        results.timing.processing = processing && processing[1] ? processing[1] : null;
        var waiting = output.match(/\nWaiting:\s+\d+\s+(\d+)\s/);
        results.timing.waiting = waiting && waiting[1] ? waiting[1] : null;
        var total = output.match(/\nTotal:\s+\d+\s+(\d+)\s/);
        results.timing.total = total && total[1] ? total[1] : null;

        var result = null;
        if (clients > 1) {
            var complete = output.match(/\nComplete requests:\s+(\d+)/);
            var failed = output.match(/\nFailed requests:\s+(\d+)/);
            result = [
                moment().utc().format('ddd, D MMM YYYY HH:mm:ss GMT'),
                null,
                results.timing.connect,
                results.timing.processing,
                results.timing.waiting,
                results.timing.total,
                null,
                complete && complete[1] && failed && failed[1] ? complete[1] + '/' + failed[1] : null
            ];
            self.log('Result: ' + result.join(','), 'ab-result');
            results.requests.push(result);
            return results;
        }

        var i = 0, matches = output.match(regex);
        if (matches && matches.length > 0) {
            for (i; i < matches.length; i++) {
                result = [];
                self.log(matches[i].trim(), 'match ' + i, 'silly');

                var dateResults = matches[i].match(/\nDate: (.+)/);
                result.push(dateResults && dateResults[1] ? dateResults[1] : moment().utc().format('ddd, D MMM YYYY HH:mm:ss GMT'));

                var statusResults = matches[i].match(/\nHTTP\/1\.1 (\d{3}) /m);
                result.push(statusResults && statusResults[1] ? statusResults[1] : null);

                result.push(results.timing.connect);
                result.push(results.timing.processing);
                result.push(results.timing.waiting);
                result.push(results.timing.total);

                var responseResults = matches[i].match(new RegExp('(' + content.replace(/\\n/g, '(?:\r\n|\n)') + ')', 'm'));
                if (responseResults && responseResults[1]) {
                    if (self.getOption('valid')) {
                        result.push(responseResults[1].match(new RegExp(self.getOption('valid').replace(/\\n/g, '(?:\r\n|\n)'), 'gm')) ? 'valid' : 'invalid');
                    }
                }

                self.log('Result: ' + result.join(','), 'ab-result');
                results.requests.push(result);
            }
        }
        for (i; i < (clients * count); i++) {
            result = [ moment().utc().format('ddd, D MMM YYYY HH:mm:ss GMT'), null ];

            result.push(results.timing.connect);
            result.push(results.timing.processing);
            result.push(results.timing.waiting);
            result.push(results.timing.total);
            if (self.getOption('valid')) {
                result.push('failed');
            }

            self.log('Failed: ' + result.join(','), 'ab-result', 'error');
            results.requests.push(result);
        }

        return results;
    }

    function runApacheBenchmark(clients, count, url, postData, postType, cb) {
        const args = ['-l', '-s', '10'];
        var abOutput = '';

        if (clients == 1) {
            args.push('-v');
            args.push('2');
        }

        if (clients > 1) {
            args.push('-c');
            args.push(clients);
        }

        if (count > 1 || clients > 1) {
            args.push('-n');
            args.push(clients * count);
        }

        if (null !== postData) {
            const test = self.getNextTest(),
                tmp = require('tmp');
            for (var i = 0; i < test.length; i++) {
                postData = postData.replace('%'+ i + '%', test[i]);
            }

            var tmpPost = tmp.fileSync({}).name;
            fs.writeFileSync(tmpPost, postData, 'utf8');

            args.push('-p');
            args.push(tmpPost);

            args.push('-T');
            args.push(postType);
        }

        if (null !== self.getOption('headers')) {
            const headers = self.getOption('headers').split('\\n');

            for (var j = 0; j < headers.length; j++) {
                args.push('-H');
                args.push(headers[j]);
            }
        }

        args.push(self.getOption('url'));

        const command = 'ab ' + args.map(function (arg) { return arg.match && arg.match(/ /) ? '"' + arg.replace(/"/, '\\"') + '"' : arg; }).join(' ');
        self.log('Command: ' + command, 'ab');

        try {
            const spawned = require('child_process').spawnSync('ab', args, { encoding: 'utf8', maxBuffer: 500000000 });
            abOutput = spawned.stdout.toString();
            var results = parseOutput(abOutput, clients, count);
            if (null !== self._output) {
                logToCsv(results.requests)(cb);
            }
        } catch (err) {
            self.log('An error occurred while executing ab', 'run', 'error');
        }
    }

    this.runOnce = function (callback) {
        callback = callback || null;
        self.log('Running the test');
        runApacheBenchmark(
            self.getOption('clients'),
            self.getOption('tries'),
            self.getOption('url'),
            self.getOption('post'),
            self.getOption('post-type'),
            callback
        );
    };

    this.log = function (message, context, level) {
        log.log(level || 'info', context || 'run', message);
    };
}

module.exports.HttpCheck = HttpCheck;


