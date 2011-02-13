var util = require('../util'); // selleck's util, not Node's util.

function View(data, config) {
    util.mix(this, data);

    this._config = config;
    this.layout  = config.layout;
}

View.prototype = {
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
