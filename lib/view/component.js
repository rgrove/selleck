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
    // TODO: Make the project name (YUI 3) configurable on the global level.
    return 'YUI 3: ' + (this.displayName || this.name);
};

module.exports = ComponentView;
