/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var HTML_CHARS = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;'
};

/**
Iterates over all items in _obj_ if _obj_ is an array, or over all enumerable
properties if _obj_ is an object, calling the _callback_ for each one.

@method each
@param {Array|Object} obj Array or object to iterate over.
@param {callback}
  @param {mixed} value Value of the current array item or property.
  @param {Number|String} key Index (if _obj_ is an array) or key (if _obj_ is an
      object).
**/
function each(obj, callback) {
    if (Array.isArray(obj)) {
        obj.forEach(callback);
    } else {
        Object.keys(obj).forEach(function (key) {
            callback(obj[key], key);
        });
    }
}
exports.each = each;

/**
Escapes HTML characters in _html_.

@method escapeHTML
@param {String} html String to escape.
@return {String} Escaped string.
**/
function escapeHTML(html) {
    return html.replace(/[&<>"'\/`]/g, function (match) {
        return HTML_CHARS[match];
    });
}
exports.escapeHTML = escapeHTML;

/**
Returns a new object containing a deep merge of the enumerable properties of all
passed objects. Properties in later arguments take precedence over properties
with the same name in earlier arguments. Object values are deep-cloned. Array
values are _not_ deep-cloned.

@method merge
@param {object} obj* One or more objects to merge.
@return {object} New object with merged values from all other objects.
**/
function merge() {
    var args   = Array.prototype.slice.call(arguments),
        target = {};

    args.unshift(target);
    mix.apply(this, args);

    return target;
}
exports.merge = merge;

/**
Like `merge()`, but augments the first passed object with a deep merge of the
enumerable properties of all other passed objects, rather than returning a
brand new object.

@method mix
@param {object} target Object to receive mixed-in properties.
@param {object} obj* One or more objects to mix into _target_.
@return {object} Reference to the same _target_ object that was passed in.
**/
function mix() {
    var args   = Array.prototype.slice.call(arguments),
        target = args.shift(),
        i, key, keys, len, source, value;

    while ((source = args.shift())) {
        keys = Object.keys(source);

        for (i = 0, len = keys.length; i < len; ++i) {
            key   = keys[i];
            value = source[key];

            if (typeof value === 'object' && !Array.isArray(value)) {
                typeof target[key] === 'object' || (target[key] = {});
                mix(target[key], value);
            } else {
                target[key] = value;
            }
        }
    }

    return target;
}
exports.mix = mix;

/**
If _obj_ is an array, returns `obj.length`. If _obj_ is an object, returns the
number of enumerable properties.

@method size
@param {array|object} obj Array or object.
@return {int} Size.
**/
function size(obj) {
    return Array.isArray(obj) ? obj.length : Object.keys(obj).length;
}
exports.size = size;

/**
Returns an array of values in _obj_.

@method values
@param {Array|Object} obj Array or object.
@return {Array} Values.
**/
function values(obj) {
    var result = [];

    each(obj, function (value) {
        result.push(value);
    });

    return result;
}
exports.values = values;

/**
Creates a stack for multiple callback management:

    var s = new util.Stack();

    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));

    s.done(function() {
        // Called when all async methods are done.
    });

@class Stack
@return {Stack} Stack instance
@constructor
**/
var Stack = function () {
    this.errors   = [];
    this.finished = 0;
    this.results  = [];
    this.total    = 0;
};

Stack.prototype = {
    add: function (fn) {
        var self  = this,
            index = self.total;

        self.total += 1;

        return function (err) {
            if (err) { self.errors[index] = err; }

            self.finished += 1;
            self.results[index] = fn.apply(null, arguments);
            self.test();
        };
    },

    test: function () {
        if (this.finished >= this.total && this.callback) {
            this.callback.call(null, this.errors.length ? this.errors : null,
                    this.results, this.data);
        }
    },

    done: function (callback, data) {
        this.callback = callback;
        this.data     = data;
        this.test();
    }
};

exports.Stack = Stack;
