/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var util = require('../util'); // Selleck's util, not Node's util.

function View(data, templateName) {
    this.templateName = templateName;
    util.mix(this, data);

    if (this.examples) {
        this.examples.forEach(function (example) {
            // If the name of the current template matches the name of an
            // example, mix the example's metadata into the view.
            if (example.name === this.templateName) {
                this.example = true;
                util.mix(this, example);
            }
        }, this);
    }

    if (this.pages) {
        // If the name of the current template matches the name of a page
        // with custom metadata, mix the page's metadata into the view.
        if (this.pages[this.templateName]) {
            util.mix(this, this.pages[this.templateName]);
        }
    }
}

View.prototype = {
    // -- Properties -----------------------------------------------------------

    /**
    @property toc
    **/
    toc: require('../higgins').TOC_PLACEHOLDER_TEXT,

    // -- Functions ------------------------------------------------------------
    hasExamples: function () {
        return !!this.examples;
    },

    htmlTitle: function () {
        var name  = this.displayName || this.name,
            title = name;

        if (title) {
            if (this.example) {
                title += ' - Example';
            }

            if (this.projectName) {
                title += ' - ' + this.projectName;
            }
        } else {
            title = this.projectName;
        }

        return title;
    },

    title: function () {
        var name  = this.displayName || this.name,
            title = this.projectName;

        if (this.example) {
            title += ' Example';
        }

        if (name) {
            title += ': ' + name;
        }

        return title;
    }
};

module.exports = View;
