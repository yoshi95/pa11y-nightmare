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

var defaults = {
			htmlcs: __dirname + '/vendor/HTMLCS.js',
			processor: __dirname + '/report-processor.js',
			ignore: [],
			standard: 'WCAG2AA'
		};
		
function writeAccessibilityReport(options, result, url) {
	var fs = require('fs-extra'),
			parts = url.split('/'),
			name = (parts[parts.length - 1] || 'home') + '.' + options.type,
			path = options.outdir + '/' + name;
	if (!fs.existsSync(options.outdir)) {
		fs.mkdirSync(options.outdir);
	}
  fs.writeFileSync(path, result);
}

function defaultOptions(options) {
	var combinedOptions = Object.assign({}, defaults, options);
	combinedOptions.ignore = combinedOptions.ignore.map(String.prototype.toLowerCase);
	return combinedOptions;
}

function pa11y(options) {
	var combinedOptions = defaultOptions(options),
			type = combinedOptions.type;
	if (['Section508', 'WCAG2A', 'WCAG2AA', 'WCAG2AAA'].indexOf(combinedOptions.standard) === -1) {
		throw new Error('Standard must be one of Section508, WCAG2A, WCAG2AA, WCAG2AAA');
	}
	if (type && ['json', 'csv', 'html'].indexOf(type) === -1) {
		throw new Error('Report type must be one of [json, csv, html]');
	}
	if (type && !combinedOptions.outdir) {
		throw new Error('Report output location must be deifined');
	}
	combinedOptions.reporter = type && require('../reporter/' + type) ||
		{ process: console.log };
	return { testPage: AccessibilityTest(combinedOptions) };
}

function AccessibilityTest(options) {
	return function *accessibiltiyTest(page) {
		var url = yield page.url();
		var results = yield page.inject('js', options.htmlcs)
							.inject('js', options.processor)
							.evaluate(buildReport, options)
							.wait(waitForReport)
							.evaluate(getReport);
		var report = options.reporter.process(results, url);
		if (options.outdir) {
			yield writeAccessibilityReport(options, report, url);	
		}
	};
}

function getReport() {
	return window.HTMLCS_report || window.HTMLCS_error;
}

function waitForReport() {
	return (window.HTMLCS_report !== undefined) || (window.HTMLCS_error !== undefined);
}

function buildReport(options) {
	try {
		window.HTMLCS.process(options.standard, window.document,
		function processMessages() {
			window.HTMLCS_report = HTMLCS_processor(options, window.HTMLCS.getMessages());
		},
		function processErrors() {
			window.HTMLCS_error = 'error running HTML_CodeSniffer';
		});
	} catch(ex) {
		window.HTMLCS_error = 'error running HTML_CodeSniffer: ' + ex.stack;
	}
}

module.exports = pa11y;



