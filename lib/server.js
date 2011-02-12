var path    = require('path'),
    express = require('express'),

    selleck   = require('../'),
    fileutils = require('./fileutils'),
    util      = require('./util'); // Selleck util, not Node util.

module.exports = function (options) {
    var app        = express.createServer(),
        components = {},
        docPaths   = selleck.findDocPaths(options.rootPath);

    app.configure(function () {
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack     : true
        }));
    });

    // Gather the names of all components.
    docPaths.forEach(function (docPath) {
        var meta = selleck.getMetadata(docPath);

        if (meta.name) {
            components[meta.name] = docPath;
        }
    });

    // Static assets.
    app.get(/^\/(?:([\w\-]+)\/)?assets\/(.+)$/, function (req, res, next) {
        var component = req.params[0],
            filePath  = req.params[1],
            root      = component ? components[component] : options.template;

        if (!root || filePath.indexOf('..') !== -1) { return next(); }

        filePath = path.join(root, 'assets', filePath);

        if (!fileutils.isFile(filePath)) { return next(); }

        res.contentType(filePath);
        res.sendfile(filePath);
    });

    // Template root.
    app.get(/^\/(?:([\w\-]+).html)?$/, function (req, res, next) {
        var docPath  = options.template,
            pageName = req.params[0] || 'index',
            view;

        if (pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(path.join(docPath, pageName + '.mustache'));

        if (!page) { return next(); }

        view = new selleck.View(selleck.getMetadata(docPath), {
            layout: selleck.getLayouts(docPath).main
        });

        res.header('Content-Type: text/html;charset=utf-8');
        res.send(selleck.render(page, view, selleck.getPartials(docPath)));
    });

    // Component docs.
    app.get(/^\/([\w\-]+)(?:\/|\/([\w\-]+)\.html)$/, function (req, res, next) {
        var component = req.params[0],
            docPath   = components[component],
            pageName  = req.params[1] || 'index',
            layouts, meta, page, partials;

        if (!docPath || pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(path.join(docPath, pageName + '.mustache'));

        if (!page) { return next(); }

        meta = util.merge(
            selleck.getMetadata(options.template),
            selleck.getMetadata(docPath)
        );

        layouts = util.merge(
            selleck.getLayouts(options.template),
            selleck.getLayouts(docPath)
        );

        partials = util.merge(
            selleck.getPartials(options.template),
            selleck.getPartials(docPath)
        );

        view = new selleck.ComponentView(meta, {layout: layouts.component});

        res.header('Content-Type: text/html;charset=utf-8');
        res.send(selleck.render(page, view, partials));
    });

    // Redirect component requests that don't have a trailing slash.
    app.get('/:component', function (req, res) {
        res.redirect('/' + req.params.component + '/', 301);
    });

    app.listen(options.serverPort || 3000);

    selleck.log('Selleck is now giving Ferrari rides at http://localhost:' +
            (options.serverPort || 3000), 'info');
};
