/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var util = require('../util'); // selleck's util, not Node's util.

function View(data, config) {
    util.mix(this, data);

    this._config = config;

    this._toc = {
        headings: [],
        level   : 1,
        names   : {},
    };

    this._lastHeading = this._toc;

    this.layout = config.layout;
}

View.TOC_PLACEHOLDER_TEXT = '__SELLECK_TOC_PLACEHOLDER__';

View.prototype = {
    /**
    @property toc
    **/
    toc: View.TOC_PLACEHOLDER_TEXT,

    /**
    Function section that escapes HTML characters in the section content and
    wraps it in a syntax-highlighted `<pre>` block.

    @example
        {{#code}}
        YUI().use('example', function () {
          // Here's some example code that will be escaped and
          // highlighted.
        });
        {{/code}}

    @method code
    @return {Function}
    **/
    code: function () {
        return function (content, render) {
            return  '<pre class="code prettyprint"><code>' +
                        util.escapeHTML(render(unindent(content))) +
                    '</code></pre>\n';
        };
    },

    /**
    @method h1
    **/
    h1: function () {
        return function (content, render) {
            // Top-level headings don't go into the table of contents.
            return '<h1>' + render(content) + '</h1>';
        };
    },

    /**
    @method h2
    **/
    h2: function () {
        return function (content, render) {
            return this._addHeading(2, render(content));
        };
    },

    /**
    @method h3
    **/
    h3: function () {
        return function (content, render) {
            return this._addHeading(3, render(content));
        };
    },

    /**
    @method h4
    **/
    h4: function () {
        return function (content, render) {
            return this._addHeading(4, render(content));
        };
    },

    /**
    @method h5
    **/
    h5: function () {
        return function (content, render) {
            return this._addHeading(5, render(content));
        };
    },

    /**
    @method h6
    **/
    h6: function () {
        return function (content, render) {
            return this._addHeading(6, render(content));
        };
    },

    /**
    Function section that generates an in-page link to the first heading with
    the specified title. Note that if there are multiple headings with the same
    title, this will only generate a link to the first one.

    @method hlink
    @return {Function}
    **/
    hlink: function () {
        return function (content, render) {
            var name = this._getHeadingName(util.escapeHTML(render(content)), false);
            return '<a href="#' + name + '">' + content + '</a> ';
        };
    },

    /**
    Function section that wraps the given HTML content in an "intro" box.

    @method intro
    @return {Function}
    **/
    intro: function () {
        return function (content, render) {
            return '<div class="intro">' +
                     render(content) +
                   '</div>\n';
        };
    },

    /**
    Similar to `code()`, but for commands that should be entered into a
    terminal. Shell prompts ($ or #) at the beginnings of lines will be made
    non-selectable to make copying and pasting easier.

    @example
        {{#terminal}}
        $ cd /foo
        $ make install clean
        {{/terminal}}

    @method terminal
    @return {Function}
    **/
    terminal: function () {
        return function (content, render) {
            content = util.escapeHTML(render(unindent(content)));

            // Make # and $ prompts unselectable.
            content = content.replace(/^([#\$]\s*)/gm,
                    '<span class="noselect">$1</span>');

            return  '<pre class="terminal">' + content + '</pre>\n';
        };
    },

    // -- Protected Functions --------------------------------------------------

    _addHeading: function (level, html) {
        var name = this._getHeadingName(util.escapeHTML(html)),

            heading = {
                headings: [],
                html    : html,
                level   : level,
                name    : name
            },

            last = this._lastHeading;

        // Mark this name as taken.
        this._toc.names[name] = true;

        while (level < last.level) {
            last = last.parent;
        }

        if (level === last.level) {
            heading.parent = last.parent;
            heading.parent.headings.push(heading);
        } else if (level > last.level) {
            heading.parent = last;
            last.headings.push(heading);
        } else {
            // This should never happen.
            log('Unexpected heading level: ' + level, 'error');
        }

        this._lastHeading = heading;

        return '<h' + level + ' id="' + name + '">' + html + '</h' + level + '>';
    },

    _getHeadingName: function (text, append) {
        // Collapse whitespace and replace it with -, and remove all
        // characters other than 0-9, a-z, _, and -.
        var name = text.toLowerCase()
                        .replace(/&[^\s;]+;?/g, '') // remove HTML entities
                        .replace(/[^\s\w\-]+/g, '')
                        .replace(/\s+/g, '-') + (append || '');

        if (this._toc.names[name] && append !== false) {
            // If the name is not unique, recurse and try appending incrementing
            // numbers to it until it is.
            return this._getHeadingName(text, (append || 1) + 1);
        }

        return name;
    }
};

// -- Private Functions --------------------------------------------------------

/**
Normalizes the initial indentation of the given _content_ so that the first line
is unindented, and all other lines are unindented to the same degree as the
first line. So if the first line has four spaces at the beginning, then all
lines will be unindented four spaces.

@method unindent
@param {String} content Text to unindent.
@return {String} Unindented text.
@private
**/
function unindent(content) {
    var indent = content.match(/^(\s+)/);

    if (indent) {
        content = content.replace(new RegExp('^' + indent[1], 'gm'), '');
    }

    return content;
}

module.exports = View;
