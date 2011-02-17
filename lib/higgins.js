/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

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
        this._renderTableOfContents()
            ._parseLinks();

        return this._html;
    },

    // -- Protected Functions --------------------------------------------------
    _addHeading: function (level, html, attrs) {
        var last = this._lastHeading,
            name, heading;

        attrs || (attrs = {});
        name = attrs.id || (attrs.id = this._getHeadingName(util.escapeHTML(html)));

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
                        .replace(/&[^\s;]+;?/g, '') // remove HTML entities
                        .replace(/[^\s\w\-]+/g, '')
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

    _stringifyAttrs: function (attrs) {
        var result = [];

        Object.keys(attrs).forEach(function (name) {
            result.push(name + '="' + attrs[name].replace(/"/g, '&quot;') + '"');
        });

        return result.join(' ');
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
    },

    _parseLinks: function () {
        var self = this;

        this._html = this._html.replace(/\[\[#(.+?)(?:\|(.+?))?\]\]/g, function (match, heading, html) {
            var name = self._getHeadingName(util.escapeHTML(heading), false);
            html || (html = heading);

            return '<a href="#' + name + '">' + html + '</a> ';
        });
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
    }
};

module.exports = Higgins;
