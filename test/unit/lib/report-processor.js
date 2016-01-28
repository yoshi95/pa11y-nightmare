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

describe('lib/report-processor', function() {
	var reportProcessor, options, window;

	beforeEach(function() {
		window = require('../mock/window');
		options = {
			ignore: [],
			standard: 'FOO-STANDARD',
			wait: 0
		};
		reportProcessor = require('../../../lib/report-processor');
	});

	it('should be a function', function() {
		assert.isFunction(reportProcessor);
	});

	it('should callback with the messages reformatted for pa11y', function() {
		var data = [
			{
				code: 'foo-code',
				element: {
					innerHTML: 'foo inner',
					outerHTML: '<element>foo inner</element>'
				},
				msg: 'foo message',
				type: 1
			},
			{
				code: 'bar-code',
				element: {
					innerHTML: 'bar inner at more than 30 characters long',
					outerHTML: '<element>bar inner at more than 30 characters long</element>'
				},
				msg: 'bar message',
				type: 2
			},
			{
				code: 'baz-code',
				element: {
					innerHTML: 'baz inner',
					outerHTML: '<element with="loads of attributes" that="push the total outerHTML length" to="more than we really want to send back to Node.js" this="is getting kind of silly now, I really want to stop writing dummy text to push the length of this element out">baz inner</element>'
				},
				msg: 'baz message',
				type: 3
			}
		],
		expected = [
				{
					code: 'foo-code',
					context: '<element>foo inner</element>',
					message: 'foo message',
					selector: '',
					type: 'error',
					typeCode: 1
				},
				{
					code: 'bar-code',
					context: '<element>bar inner at more than 30 chara...</element>',
					message: 'bar message',
					selector: '',
					type: 'warning',
					typeCode: 2
				},
				{
					code: 'baz-code',
					context: '<element with=\"loads of attributes\" that=\"push the total outerHTML length\" to=\"more than we really want to send back to Node.js\" this=\"is getting kind of silly now, I really want to stop writing dummy text to push the length of this element out\">baz ...',
					message: 'baz message',
					selector: '',
					type: 'notice',
					typeCode: 3
				}
			];
		assert.deepEqual(expected, reportProcessor(options, data));
	});

	it('should ignore messages when their code appears in `options.ignore`', function() {
		var data = [
			{
				code: 'Foo-Code',
				element: {
					innerHTML: 'foo inner',
					outerHTML: '<element>foo inner</element>'
				},
				msg: 'foo message',
				type: 1
			},
			{
				code: 'bar-code',
				element: {
					innerHTML: 'bar inner at more than 30 characters long',
					outerHTML: '<element>bar inner at more than 30 characters long</element>'
				},
				msg: 'bar message',
				type: 2
			}
		],
		expected = [
			{
				code: 'bar-code',
				context: '<element>bar inner at more than 30 chara...</element>',
				message: 'bar message',
				selector: '',
				type: 'warning',
				typeCode: 2
			}
		];
		options.ignore.push('foo-code');
		assert.deepEqual(expected, reportProcessor(options, data));
	});

	it('should ignore messages when their type appears in `options.ignore`', function() {
		var data = [
			{
				code: 'foo-code',
				element: {
					innerHTML: 'foo inner',
					outerHTML: '<element>foo inner</element>'
				},
				msg: 'foo message',
				type: 1
			},
			{
				code: 'bar-code',
				element: {
					innerHTML: 'bar inner at more than 30 characters long',
					outerHTML: '<element>bar inner at more than 30 characters long</element>'
				},
				msg: 'bar message',
				type: 2
			}
		],
		expected = [
			{
				code: 'foo-code',
				context: '<element>foo inner</element>',
				message: 'foo message',
				selector: '',
				type: 'error',
				typeCode: 1
			}
		];
		options.ignore.push('warning');
		assert.deepEqual(expected, reportProcessor(options, data));
	});

	it('should handle malformed messages and elements', function() {
		var data = [
			{
				code: 'foo-code',
				element: {},
				msg: 'foo message',
				type: 4
			}
		],
		expected = [
			{
				code: 'foo-code',
				context: null,
				message: 'foo message',
				selector: '',
				type: 'unknown',
				typeCode: 4
			}
		];
		assert.deepEqual(expected, reportProcessor(options, data));
	});

	it('should generate CSS selectors for elements with IDs', function() {
		var element = {
			id: 'foo',
			nodeType: 1
		},
		data = [
			{
				code: 'foo-code',
				element: element,
				msg: 'foo message',
				type: 1
			}
		],
		result = reportProcessor(options, data);
		assert.isDefined(result);
		assert.lengthEquals(result, 1);
		assert.strictEqual(result[0].selector, '#foo');
	});

	it('should generate CSS selectors for elements with IDs', function() {
		var element = {
			id: 'foo',
			nodeType: 1
		},
		data = [
			{
				code: 'code',
				element: element,
				msg: 'message',
				type: 1
			}
		],
		result = reportProcessor(options, data);
		assert.isDefined(result);
		assert.lengthEquals(result, 1);
		assert.strictEqual(result[0].selector, '#foo');
	});

	it('should generate CSS selectors for elements whose parents have IDs and are unique children', function() {
		var element = {
			nodeType: 1,
			tagName: 'BAR',
			parentNode: {
				id: 'foo',
				nodeType: 1
			}
		},
		data,
		result;

		element.parentNode.childNodes = [
			{
				nodeType: 1,
				tagName: 'BAZ'
			},
			element,
			{
				nodeType: 1,
				tagName: 'BAZ'
			}
		];
		data = [
			{
				code: 'code',
				element: element,
				msg: 'message',
				type: 1
			}
		];
		result = reportProcessor(options, data);
		assert.isDefined(result);
		assert.lengthEquals(result, 1);
		assert.strictEqual(result[0].selector, '#foo > bar');
	});

	it('should generate CSS selectors for elements whose parents have IDs and are not unique children', function() {
		var element = {
			nodeType: 1,
			tagName: 'BAR',
			parentNode: {
				id: 'foo',
				nodeType: 1
			}
		},
		data,
		result;

		element.parentNode.childNodes = [
			{
				nodeType: 1,
				tagName: 'BAR'
			},
			element,
			{
				nodeType: 1,
				tagName: 'BAR'
			}
		];
		data = [
			{
				code: 'code',
				element: element,
				msg: 'message',
				type: 1
			}
		];
		result = reportProcessor(options, data);
		assert.isDefined(result);
		assert.lengthEquals(result, 1);
		assert.strictEqual(result[0].selector, '#foo > bar:nth-child(2)');
	});

	it('should generate CSS selectors for elements whose parents have no IDs', function() {
		var element = {
			nodeType: 1,
			tagName: 'BAR',
			parentNode: {
				nodeType: 1,
				tagName: 'FOO'
			}
		},
		data,
		result;
		element.parentNode.childNodes = [
			element
		];
		data = [
			{
				code: 'code',
				element: element,
				msg: 'message',
				type: 1
			}
		];
		result = reportProcessor(options, data);
		assert.isDefined(result);
		assert.lengthEquals(result, 1);
		assert.strictEqual(result[0].selector, 'foo > bar');
	});
});
