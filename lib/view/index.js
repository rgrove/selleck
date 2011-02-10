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
                        util.escapeHTML(render(content)) +
                    '</code></pre>';
        };
    }
};

module.exports = View;
