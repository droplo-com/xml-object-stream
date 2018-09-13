/**
 * @author Michał Żaloudik <ponury.kostek@gmail.com>
 */
"use strict";
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const XMLStream = require('./xml-stream');
/**
 *
 * @param {stream.Readable} stream
 * @param {Object} [options]
 * @param {Array} [options.emitElements]
 * @param {Number} [options.defaultElementDepth]
 * @returns {XMLObjectStream}
 * @constructor
 */
function XMLObjectStream(stream, options) {
	options = options || {};
	if (!(this instanceof XMLObjectStream)) {
		return new XMLObjectStream(stream, options);
	}
	EventEmitter.call(this);
	/**
	 *
	 * @type {Array}
	 */
	this.elementStack = [];
	/**
	 *
	 * @type {Array}
	 */
	this.objectStack = [];
	/**
	 *
	 * @type {XMLStream}
	 */
	this.parser = new XMLStream(stream);
	/**
	 *
	 * @type {stream.Readable}
	 */
	this.xmlStream = stream;
	this.parser.on('startElement', (name, attributes) => {
		startElement(this, name, attributes);
	});
	this.parser.on('endElement', (name) => {
		endElement(this, name);
	});
	this.parser.on('text', (text) => {
		onText(this, text);
	});
	this.parser.on('end', () => {
		this.emit('end');
	});
	this.parser.on('pause', () => {
		this.emit('pause');
	});
	this.parser.on('resume', () => {
		this.emit('resume');
	});
	this.parser.on('error', (err) => {
		this.emit('error', err);
	});
	/**
	 *
	 * @type {boolean}
	 */
	this.emitAll = true;
	/**
	 *
	 * @type {Set}
	 */
	this.emitElements = new Set();
	if (options.emitElements instanceof Array && options.emitElements.length !== 0) {
		this.emitAll = false;
		this.emitElements = new Set(options.emitElements);
	}
	this.defaultElementDepth = options.defaultElementDepth || 1;
}
util.inherits(XMLObjectStream, EventEmitter);
/**
 *
 */
XMLObjectStream.prototype.destroy = function () {
	return this.xmlStream.destroy();
};
/**
 *
 */
XMLObjectStream.prototype.pause = function () {
	this.parser.pause();
};
/**
 *
 */
XMLObjectStream.prototype.resume = function () {
	this.parser.resume();
};
/**
 *
 * @param {XMLObjectStream} xos
 * @param {String} name
 * @param {Object} attributes
 */
function startElement(xos, name, attributes) {
	if (name === undefined) {
		return;
	}
	xos.emit('startElement', name, attributes);
	xos.elementStack.push(name);
	if (xos.elementStack.length > xos.defaultElementDepth) {
		const element = {
			//$path : xos.elementStack.join('/'),
			$name : name,
			$ : attributes
		};
		if (xos.objectStack.length !== 0) {
			const parent = xos.objectStack[xos.objectStack.length - 1];
			if (parent[name] === undefined) {
				parent[name] = element;
			} else if (parent[name] instanceof Array) {
				parent[name].push(element);
			} else {
				parent[name] = [
					parent[name],
					element
				];
			}
		}
		xos.objectStack.push(element);
	}
}
/**
 *
 * @param {XMLObjectStream} xos
 * @param {String} name
 */
function endElement(xos, name) {
	if (name === undefined) {
		return;
	}
	xos.emit('endElement', name);
	const lastName = xos.elementStack.pop();
	const lastObject = xos.objectStack.pop();
	if (lastObject !== undefined && typeof lastObject.$text === 'string') {
		lastObject.$text = lastObject.$text.trim();
		if (lastObject.$text.length === 0) {
			delete lastObject.$text;
		}
	}
	if (name !== lastName) {
		return xos.emit('error', 'Unexpected end of element "' + name + '"');
	}
	if (xos.emitAll) {
		if (xos.elementStack.length === xos.defaultElementDepth) {
			xos.emit('element', lastObject);
		}
	} else if (xos.emitElements.has(name)) {
		xos.emit('element', lastObject);
	}
}
/**
 *
 * @param {XMLObjectStream} xos
 * @param {String} text
 */
function onText(xos, text) {
	if (text === undefined) {
		return;
	}
	if (xos.objectStack.length !== 0) {
		const current = xos.objectStack[xos.objectStack.length - 1];
		if (typeof current.$text !== 'string') {
			current.$text = '';
		}
		current.$text = current.$text + text;
	}
}
module.exports = XMLObjectStream;
