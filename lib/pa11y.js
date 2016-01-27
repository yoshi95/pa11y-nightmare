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

'use strict';

var extend = require('node.extend'),
		pkg = require('../package.json'),
		reportProcessor = require('./report-processor');

module.exports = pa11y;
module.exports.defaults = {
	htmlcs: __dirname + '/vendor/HTMLCS.js',
	ignore: [],
	log: {
		begin: /* istanbul ignore next */ function() {},
		debug: /* istanbul ignore next */ function() {},
		error: /* istanbul ignore next */ function() {},
		info: /* istanbul ignore next */ function() {},
		results: /* istanbul ignore next */ function() {}
	},
	page: {
		settings: {
			userAgent: 'pa11y/' + pkg.version
		}
	},
	nightmare: {
		onStdout: /* istanbul ignore next */ function() {},
		parameters: {
			'ignore-ssl-errors': 'true'
		}
	},
	standard: 'WCAG2AA',
	wait: 0
};

function lowercase(str) {
	return str.toLowerCase();
}

function defaultOptions(options) {
	options = extend(true, {}, module.exports.defaults, options);
	options.ignore = options.ignore.map(lowercase);
	return options;
}

function pa11y(options) {
	options = defaultOptions(options);
	if (['Section508', 'WCAG2A', 'WCAG2AA', 'WCAG2AAA'].indexOf(options.standard) === -1) {
		throw new Error('Standard must be one of Section508, WCAG2A, WCAG2AA, WCAG2AAA');
	}
	return { testPage: testPage.bind(null, options) };
}

function *testPage(options, page, done, error) {
	var results = yield page.inject('js', options.htmlcs)
													.inject('js', __dirname + '/inject.js')
													.evaluate(function(options, done, error) {
														try {
															window.HTMLCS.process(options.standard, window.document, done);
														} catch (ex) {
															error('HTML CodeSniffer: ' + ex.message);
														}
													}, options, done, error);
	return results;
}

function onCodeSnifferComplete() {
	done({
		messages: processMessages(window.HTMLCS.getMessages())
	});
}
