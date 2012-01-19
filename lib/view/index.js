/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var util = require('../util'); // Selleck's util, not Node's util.

function View(data, templateName) {
    var self = this;

    this.templateName = templateName;

    util.mix(this, data);

    if (this.pages) {
        // If the name of the current template matches the name of a page
        // with custom metadata, mix the page's metadata into the view.
        if (this.pages[this.templateName]) {
            this.page = true;
            util.mix(this, this.pages[this.templateName]);
        } else {
            /*
            Template name was not found in this pages list, so walk all the pages and 
            see if any of them contain this example. If it does, then
            mix the data in and reset the `self.examples` before the
            below code mixes them.
            */
            util.each(self.pages, function(page) {
                if (page.examples) {
                    util.each(page.examples, function(example) {
                        if (example.name === self.templateName) {
                            util.mix(self, example);
                            self.examples = page.examples;
                        }
                    });
                }
            });
        }
    }

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
}

View.prototype = {
    // -- Properties -----------------------------------------------------------

    /**
    @property toc
    **/
    toc: require('../higgins').TOC_PLACEHOLDER_TEXT,

    // -- Functions ------------------------------------------------------------
    htmlTitle: function () {
        return typeof this.title === 'function' ? this.title() : this.title;
    },

    title: function () {
        var title = this.displayName || this.name || this.projectName;

        if (this.example) {
            title = 'Example: ' + title;
        }

        return title;
    }
};

module.exports = View;
