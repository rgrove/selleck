var fsPath  = require('path'),
    express = require('express'),

    selleck   = require('../'),
    fileutils = require('./fileutils'),
    util      = require('./util'); // Selleck util, not Node util.

module.exports = function (options) {
    var app        = express.createServer(),
        components = {},
        docs       = {project: options.project, components: []},
        projectPath;

    docs        = selleck.findDocs(options.rootPath, docs);
    projectPath = docs.project && docs.project.path;

    // Gather the names of all components.
    docs.components.forEach(function (component) {
        var path = component.path,
            meta = selleck.getMetadata(path, 'component');

        if (meta.name) {
            components[meta.name] = path;
        }
    });

    app.configure(function () {
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack     : true
        }));
    });

    // Static assets.
    app.get(/^\/(?:([\w\-]+)\/)?assets\/(.+)$/, function (req, res, next) {
        var component = req.params[0],
            filePath  = req.params[1],
            root      = component ? components[component] : projectPath,
            themeFilePath;

        if (!root || filePath.indexOf('..') !== -1) { return next(); }

        themeFilePath = fsPath.join(options.theme, 'assets', filePath);
        filePath      = fsPath.join(root, 'assets', filePath);

        if (!fileutils.isFile(filePath)) {
            if (fileutils.isFile(themeFilePath)) {
                // Fall back to theme assets if project or component assets
                // aren't found.
                filePath = themeFilePath;
            } else {
                return next();
            }
        }

        res.contentType(filePath);
        res.sendfile(filePath);
    });

    // Project docs.
    app.get(/^\/(?:([\w\-]+).html)?$/, function (req, res, next) {
        var pageName = req.params[0] || 'index',
            layouts, view;

        if (!projectPath || pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(fsPath.join(projectPath, pageName + '.mustache'));

        if (!page) { return next(); }

        layouts = util.merge(
            selleck.getLayouts(options.theme),
            selleck.getLayouts(projectPath)
        );

        view = new selleck.View(selleck.getMetadata(projectPath, 'project'), {
            layout: layouts.main
        });

        res.header('Content-Type: text/html;charset=utf-8');
        res.send(selleck.render(page, view, selleck.getPartials(projectPath)));
    });

    // Component docs.
    app.get(/^\/([\w\-]+)(?:\/|\/([\w\-]+)\.html)$/, function (req, res, next) {
        var component = req.params[0],
            docPath   = components[component],
            pageName  = req.params[1] || 'index',
            layouts, meta, page, partials;

        if (!docPath || pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(fsPath.join(docPath, pageName + '.mustache'));

        if (!page) { return next(); }

        meta = util.merge(
            selleck.getMetadata(projectPath, 'project'),
            selleck.getMetadata(docPath, 'component')
        );

        layouts = util.merge(
            selleck.getLayouts(options.theme),
            selleck.getLayouts(projectPath),
            selleck.getLayouts(docPath)
        );

        partials = util.merge(
            selleck.getPartials(projectPath),
            selleck.getPartials(docPath)
        );

        view = new selleck.ComponentView(meta, {layout: layouts.component});

        res.header('Content-Type: text/html;charset=utf-8');
        res.send(selleck.render(page, view, partials));
    });

    // Redirect component requests that don't have a trailing slash.
    app.get(/^\/([\w\-]+)$/, function (req, res) {
        res.redirect('/' + req.params[0] + '/', 301);
    });

    app.listen(options.serverPort || 3000);

    selleck.log('Selleck is now giving Ferrari rides at http://localhost:' +
            (options.serverPort || 3000), 'info');
};
