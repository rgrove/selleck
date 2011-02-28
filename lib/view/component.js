/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var nodeUtil = require('util'),
    View     = require('./'),

    proto;

function ComponentView() {
    ComponentView.super_.apply(this, arguments);
}
nodeUtil.inherits(ComponentView, View);

proto = ComponentView.prototype;

proto.useParams = function () {
    if (Array.isArray(this.use)) {
        return "'" + this.use.join("', '") + "'";
    } else {
        return this.use;
    }
};

module.exports = ComponentView;
