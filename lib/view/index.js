/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var util = require('../util'); // Selleck's util, not Node's util.

function View(data) {
    util.mix(this, data);
}

View.prototype = {
    /**
    @property toc
    **/
    toc: require('../higgins').TOC_PLACEHOLDER_TEXT,

    title: function () {
        var name = this.displayName || this.name;

        if (name) {
            return this.projectName + ': ' + name;
        } else {
            return this.projectName;
        }
    }
};

// -- Private Functions --------------------------------------------------------

module.exports = View;
