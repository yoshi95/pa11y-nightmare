// This file is part of pa11y.
//
// pa11y is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// pa11y is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with pa11y.  If not, see <http://www.gnu.org/licenses/>.

// jshint maxstatements: false
// jscs:disable disallowMultipleVarDecl, maximumLineLength
'use strict';

var assert = require('proclaim');
var mockery = require('mockery');
var path = require('path');
var sinon = require('sinon');

describe('lib/pa11y', function() {
	var extend, injectScriptPath, pa11y, nightmare, pkg, window;

	beforeEach(function() {

		extend = sinon.spy(require('node.extend'));
		mockery.registerMock('node.extend', extend);

		injectScriptPath = path.resolve(__dirname, '..', '..', '..', 'lib', 'report-processor.js');

		nightmare = require('../mock/nightmare');
		mockery.registerMock('nightmare', nightmare);

		pkg = require('../../../package.json');

		window = require('../mock/window');

		pa11y = require('../../../lib/pa11y');

	});

	it('should be a function', function() {
		assert.isFunction(pa11y);
	});

	it('should have a `defaults` property', function() {
		assert.isObject(pa11y.defaults);
	});

	describe('.defaults', function() {
		var defaults;

		beforeEach(function() {
			defaults = pa11y.defaults;
		});

		it('should have an `htmlcs` property', function() {
			assert.strictEqual(defaults.htmlcs, path.resolve(__dirname + '/../../..') + '/lib/vendor/HTMLCS.js');
		});

		it('should have an `ignore` property', function() {
			assert.isArray(defaults.ignore);
		});

		it('should have a `log` property', function() {
			assert.isObject(defaults.log);
		});

		it('should have a `log.debug` method', function() {
			assert.isFunction(defaults.log.debug);
		});

		it('should have a `log.error` method', function() {
			assert.isFunction(defaults.log.error);
		});

		it('should have a `log.info` method', function() {
			assert.isFunction(defaults.log.info);
		});

		it('should have a `page` property', function() {
			assert.isObject(defaults.page);
		});

		it('should have a `page.settings` property', function() {
			assert.isObject(defaults.page.settings);
		});

		it('should have a `page.settings.userAgent` property', function() {
			assert.strictEqual(defaults.page.settings.userAgent, 'pa11y/' + pkg.version);
		});

		it('should have a `nightmare` property', function() {
			assert.isObject(defaults.nightmare);
		});

		it('should have a `nightmare.onStdout` method', function() {
			assert.isFunction(defaults.nightmare.onStdout);
		});

		it('should have a `nightmare.parameters` property', function() {
			assert.isObject(defaults.nightmare.parameters);
		});

		it('should have a `nightmare.parameters[\'ignore-ssl-errors\']` property', function() {
			assert.strictEqual(defaults.nightmare.parameters['ignore-ssl-errors'], 'true');
		});

		it('should have a `standard` property', function() {
			assert.strictEqual(defaults.standard, 'WCAG2AA');
		});

		it('should have a `wait` property', function() {
			assert.strictEqual(defaults.wait, 0);
		});

	});

	describe('.pa11y(options)', function() {
		var instance, options;

		beforeEach(function() {
			options = {
				foo: 'bar'
			};
			instance = pa11y(options);
		});

		it('should default the options', function() {
			assert.calledOnce(extend);
			assert.isTrue(extend.firstCall.args[0]);
			assert.isObject(extend.firstCall.args[1]);
			assert.strictEqual(extend.firstCall.args[2], pa11y.defaults);
			assert.strictEqual(extend.firstCall.args[3], options);
		});

		it('should lower-case all of the ignored codes and types', function() {
			options.ignore = [
				'FOO',
				'Bar',
				'baz'
			];
			extend.reset();
			pa11y(options);
			assert.deepEqual(extend.firstCall.returnValue.ignore, [
				'foo',
				'bar',
				'baz'
			]);
		});

		it('should throw an error if `options.standard` is invalid', function() {
			options.standard = 'foo';
			assert.throws(function() {
				pa11y(options);
			}, 'Standard must be one of Section508, WCAG2A, WCAG2AA, WCAG2AAA');
		});

	});

	describe('Page test function', function() {
		var expectedResults, options, runResults, testFunction;

		beforeEach(function(done) {
			options = {
				ignore: [
					'BAZ',
					'qux'
				],
				standard: 'Section508',
				wait: 0
			};
			testFunction = pa11y(options).testPage;
			expectedResults = [
					'foo',
					'bar'
				];
			nightmare.mockPage.evaluate = sinon.spy(function() {
				return new Promise(function(resolve) {
					resolve(expectedResults);
				});
			});
			testFunction(options, nightmare.mockPage);
		});

		it('should inject HTML CodeSniffer', function() {
			var inject = nightmare.mockPage.injectJs.withArgs('js', pa11y.defaults.htmlcs);
			assert.calledOnce(inject);
			assert.isFunction(inject.firstCall.args[1]);
		});

		it('should callback with an error if HTML CodeSniffer injection errors', function(done) {
			var expectedError = new Error('...');
			nightmare.mockPage.injectJs.withArgs('js', pa11y.defaults.htmlcs).yieldsAsync(expectedError);
			testFunction(options, nightmare.mockPage)
				.catch(function(error) {
					assert.isNotNull(error);
					assert.strictEqual(error, expectedError);
					done();
				});
		});

		it('should callback with an error if HTML CodeSniffer does not inject properly', function(done) {
			nightmare.mockPage.injectJs.withArgs('js', pa11y.defaults.htmlcs).yieldsAsync(null, false);
			testFunction(options, nightmare.mockPage)
				.catch(function(error) {
					assert.isNotNull(error);
					assert.strictEqual(error.message, 'Pa11y was unable to inject scripts into the page');
					done();
				});
		});

		it('should inject the pa11y inject script', function() {
			var inject = nightmare.mockPage.injectJs.withArgs(injectScriptPath);
			testFunction(options, nightmare.mockPage);
			assert.calledOnce(inject);
			assert.isFunction(inject.firstCall.args[1]);
		});

		it('should callback with an error if the pa11y inject script injection errors', function(done) {
			var expectedError = new Error('...');
			nightmare.mockPage.injectJs.withArgs(injectScriptPath).yieldsAsync(expectedError);
			testFunction(options, nightmare.mockPage)
				.catch(function(error) {
					assert.isNotNull(error);
					assert.strictEqual(error, expectedError);
					done();
				});
		});

		it('should callback with an error if the pa11y inject script does not inject properly', function(done) {
			nightmare.mockPage.injectJs.withArgs(injectScriptPath).yieldsAsync(null, false);
			testFunction(options, nightmare.mockPage)
				.catch(function(error) {
					assert.isNotNull(error);
					assert.strictEqual(error.message, 'Pa11y was unable to inject scripts into the page');
					done();
				});
		});

		describe('evaluated function()', function() {
			var evaluatedFunction, returnValue;

			beforeEach(function() {
				global.window = window;
				global.injectPa11y = sinon.spy();
				evaluatedFunction = nightmare.mockPage.evaluate.firstCall.args[0];
				returnValue = evaluatedFunction(options);
			});

			afterEach(function() {
				delete global.window;
				delete global.injectPa11y;
			});

			it('should call the `injectPa11y` global function with the expected arguments', function() {
				assert.calledOnce(global.injectPa11y);
				assert.calledWithExactly(global.injectPa11y, global.window, options, global.window.callPhantom);
			});

			it('should return nothing', function() {
				assert.isUndefined(returnValue);
			});

			it('should return an error-like structure if `window.callPhantom` is not a function', function() {
				global.injectPa11y.reset();
				delete global.window.callPhantom;
				returnValue = evaluatedFunction(options);
				assert.deepEqual(returnValue, {
					error: 'Pa11y could not report back to PhantomJS'
				});
			});

		});

		it('should log that the run is about to wait if configured to', function(done) {
			options = {
				wait: 500,
				log: {
					debug: sinon.spy()
				}
			};
			truffler.reset();
			pa11y(options);
			testFunction = truffler.firstCall.args[1];
			testFunction(nightmare.mockBrowser, nightmare.mockPage, function() {
				assert.calledWith(options.log.debug, 'Waiting for ' + options.wait + 'ms');
				done();
			});
		});

		it('should callback with the expected results', function() {
			assert.strictEqual(runResults, expectedResults.messages);
		});

		it('should callback with an error if the evaluated script errors', function(done) {
			expectedResults = {
				error: 'foo'
			};
			nightmare.mockPage.evaluate = sinon.spy(function() {
				nightmare.mockPage.onCallback(expectedResults);
			});
			testFunction(nightmare.mockBrowser, nightmare.mockPage, function(error) {
				assert.isNotNull(error);
				assert.instanceOf(error, Error);
				assert.strictEqual(error.message, 'foo');
				done();
			});
		});

	});

});
