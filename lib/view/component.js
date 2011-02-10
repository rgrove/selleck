var nodeUtil = require('util'),
    View     = require('./'),

    proto;

function ComponentView(data, config) {
    ComponentView.super_.apply(this, arguments);
}
nodeUtil.inherits(ComponentView, View);

proto = ComponentView.prototype;

proto.intro = function () {
    return function (content, render) {
        return '<div class="intro">' +
                 render(content) +
               '</div>';
    };
};

proto.title = function () {
    return this.projectName + ': ' + (this.displayName || this.name);
};

proto.useStatement = function () {
    if (Array.isArray(this.use)) {
        return "'" + this.use.join("', '") + "'";
    } else {
        return this.use;
    }
};

module.exports = ComponentView;
