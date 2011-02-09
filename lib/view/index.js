var util = require('../util'); // selleck's util, not Node's util.

function View(data, config) {
    util.mix(this, data);

    this._config = config;
    this.layout  = config.layout;
}

View.prototype = {
    code: function () {
        return function (source, render) {
            return  '<pre class="code prettyprint"><code>' +
                        util.escapeHTML(render(source)) +
                    '</code></pre>';
        };
    }
};

module.exports = View;
