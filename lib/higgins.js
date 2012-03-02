/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

/**
Higgins adds an additional parsing layer that runs after Mustache renders
Selleck templates, and takes care of things like generating a table of contents
and handling wiki-style links.
**/

var util = require('./util'); // Selleck's util, not Node's util.

function Higgins(html) {
    this._html = html;

    this._toc = {
        headings: [],
        level   : 1,
        names   : {}
    };

    this._lastHeading = this._toc;
}

Higgins.TOC_PLACEHOLDER_TEXT = '__SELLECK_TOC_PLACEHOLDER__';

Higgins.render = function (html) {
    return new Higgins(html).render();
};

Higgins.prototype = {
    // -- Public Functions -----------------------------------------------------
    render: function () {
        this._parseCode()
            ._renderTableOfContents()
            ._parseLinks();

        return this._html;
    },

    // -- Protected Functions --------------------------------------------------
    _addHeading: function (level, html, attrs) {
        var last = this._lastHeading,
            name, heading;

        attrs || (attrs = {});
        name = attrs.id || (attrs.id = util.escapeHTML(this._getHeadingName(html)));

        heading = {
            headings: [],
            html    : html,
            level   : level,
            name    : name
        };

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
        attrs = this._stringifyAttrs(attrs);

        return '<h' + level + (attrs ? ' ' + attrs : '') + '>' + html + '</h' + level + '>';
    },

    /**
    @method _generateTableOfContentsList
    **/
    _generateTableOfContentsList: function (heading) {
        var listHtml = [],
            self     = this;

        listHtml.push('<ul class="toc">');

        heading.headings.forEach(function (child) {
            listHtml.push('<li>');
            listHtml.push('<a href="#' + child.name + '">' + child.html + '</a>');

            if (child.headings.length) {
                listHtml.push(self._generateTableOfContentsList(child));
            }

            listHtml.push('</li>');
        });

        listHtml.push('</ul>');

        return listHtml.join('\n');
    },

    _getHeadingName: function (text, append) {
        // Collapse whitespace and replace it with -, and remove all
        // characters other than 0-9, a-z, _, and -.
        var name = text.toLowerCase()
                        .replace(/<[\s\S]+?>/g, '') // remove HTML tags
                        .replace(/&[^\s;]+;?/g, '') // remove HTML entities
                        .replace(/[^\s\w\-]+/g, '') // remove all chars except whitespace, word chars, and -
                        .replace(/\s+/g, '-') + (append || '');

        if (this._toc.names[name] && append !== false) {
            // If the name is not unique, recurse and try appending incrementing
            // numbers to it until it is.
            return this._getHeadingName(text, (append || 1) + 1);
        }

        return name;
    },

    _parseAttrs: function (attrs) {
        var parsed = {};

        (attrs ? attrs.split(/\s+/) : []).forEach(function (attr) {
            var match = attr.match(/\s*(.+?)\s*=\s*(["'])?(.+?)\2\s*/);

            if (match) {
                parsed[match[1]] = match[3];
            }
        });

        return parsed;
    },

    _parseCode: function () {
        // Escaped backticks.
        this._html = this._html.replace(/\\`/g, '__{{SELLECK_BACKTICK}}__');

        // Code blocks.
        this._html = this._html.replace(/^[^\S\n]*```[^\S\n]*(.+?)?$\s*^([\s\S]*?)\s*^[^\S\n]*```[^\S\n]*$/gm, function (match, type, content) {
            var classes = ['code'];

            // Escape and unindent the content.
            content = util.escapeHTML(unindent(content));

            switch (type) {
            case 'nohighlight': // fallthru
            case 'no-highlight':
            case 'raw':
                break;

            case 'terminal':
                classes.push('terminal');

                // Make # and $ prompts non-selectable, for easier copy/paste.
                content = content.replace(/^([#\$]\s*)/gm,
                        '<span class="noselect">$1</span>');
                break;

            default:
                classes.push('prettyprint');

                if (type) {
                    classes.push('lang-' + type);
                }
            }

            return '<pre class="' + classes.join(' ') + '">' + content + '</pre>\n';
        });

        // Inline code snippets.
        this._html = this._html.replace(/`(.+?)`/g, function (match, code) {
            return '<code>' + util.escapeHTML(code) + '</code>';
        });

        // Put literal backticks back in.
        this._html = this._html.replace(/__\{\{SELLECK_BACKTICK\}\}__/g, '`');

        return this;
    },

    _parseHeadings: function () {
        var self = this;

        this._html = this._html.replace(/<h([2-6])(?:\s+(.+?))?>([\s\S]+?)<\/h\1>/ig, function (match, level, attrs, html) {
            // TODO: don't match commented headings.
            attrs = self._parseAttrs(attrs);

            if (attrs['class'] && ~attrs['class'].search(/(?:^|\s)no-toc(?:\s|$)/)) {
                return match;
            } else {
                return self._addHeading(+level, html, attrs);
            }
        });

        return this;
    },

    _parseLinks: function () {
        var self = this;

        this._html = this._html.replace(/(\\)?(\[\[#(.+?)(?:\|(.+?))?\]\])/g, function (all, slash, match, heading, linkHTML) {
            var name;

            if (slash) {
                return match;
            }

            name = util.escapeHTML(self._getHeadingName(heading, false));
            linkHTML || (linkHTML = heading);

            return '<a href="#' + name + '">' + linkHTML + '</a>';
        });

        return this;
    },

    /**
    @method _renderTableOfContents
    **/
    _renderTableOfContents: function () {
        // Nothing to do if html doesn't contain a TOC placeholder.
        if (this._html.indexOf(Higgins.TOC_PLACEHOLDER_TEXT) === -1) {
            return this;
        }

        this._parseHeadings();

        // Replace the placeholder text with the generated list.
        this._html = this._html.replace(Higgins.TOC_PLACEHOLDER_TEXT,
                this._generateTableOfContentsList(this._toc));

        return this;
    },

    _stringifyAttrs: function (attrs) {
        var result = [];

        Object.keys(attrs).forEach(function (name) {
            result.push(name + '="' + attrs[name].replace(/"/g, '&quot;') + '"');
        });

        return result.join(' ');
    }
};

module.exports = Higgins;

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
