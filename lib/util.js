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
