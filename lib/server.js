/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var fsPath  = require('path'),
    express = require('express'),

    selleck   = require('../'),
    fileutils = require('./fileutils'),
    util      = require('./util'); // Selleck util, not Node util.

module.exports = function (config) {
    var app        = express.createServer(),
        components = {},
        docs       = {project: config.project, components: []},
        projectPath;

    docs        = selleck.findDocs(config.rootPath, docs);
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
        var meta        = selleck.getMetadata(projectPath, 'project', true),
            staticPaths = meta && meta.server && meta.server.staticPaths;

        if (staticPaths) {
            staticPaths = Array.isArray(staticPaths) ? staticPaths : [staticPaths];

            staticPaths.forEach(function (path) {
                app.use(express['static'](fsPath.join(projectPath, path)));
            });
        }

        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack     : true
        }));
    });

    // Static assets.
    app.get(/^\/assets\/((?:([\w\-]+)\/)?(.+))$/, function (req, res, next) {
        var component = req.params[1],
            filePath  = req.params[2],
            fullPath  = req.params[0],
            root      = component ? components[component] || projectPath : projectPath,
            paths     = [],
            foundPath, testPath;

        if (filePath.indexOf('..') !== -1) { return next(); }

        // Create an array of asset paths to search. First the component path
        // (if any), then project, and finally theme. First one that matches
        // wins.
        if (component && components[component]) {
            paths.push(fsPath.join(components[component], 'assets', filePath));
        }

        paths.push(fsPath.join(projectPath, 'assets', fullPath));
        paths.push(fsPath.join(config.theme, 'assets', fullPath));

        while (!foundPath && (testPath = paths.shift())) {
            if (fileutils.isFile(testPath)) {
                foundPath = testPath;
            }
        }

        if (!foundPath) { return next(); }

        res.contentType(foundPath);
        res.sendfile(foundPath);
    });

    // Project docs.
    app.get(/^\/(?:([\w\-]+).html)?$/, function (req, res, next) {
        var options  = {project: true},
            pageName = req.params[0] || 'index';

        if (!projectPath || pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(fsPath.join(projectPath, pageName + '.mustache'));

        if (!page) { return next(); }

        options.meta     = selleck.getMetadata(config.theme, 'theme', true);
        options.layouts  = selleck.getLayouts(config.theme);
        options.partials = selleck.getPartials(config.theme);

        selleck.prepare(projectPath, options, function (err, options, compiled) {
            if (err) { return next(err); }

            var view   = new selleck.View(options.meta, pageName),
                layout = options.layouts[view.layout];

            selleck.render(page, view, layout, options.partials, function (err, html) {
                if (err) {
                    throw new Error(err.message);
                }

                res.header('Content-Type: text/html;charset=utf-8');
                res.send(html);
            });
        });

    });

    // Component docs.
    app.get(/^\/([\w\-]+)(?:\/|\/([\w\-]+)\.html)$/, function (req, res, next) {
        var component = req.params[0],
            docPath   = components[component],
            options   = {component: true},
            pageName  = req.params[1] || 'index';

        if (!docPath || pageName.indexOf('.') !== -1) { return next(); }

        page = selleck.getPage(fsPath.join(docPath, pageName + '.mustache'));

        if (!page) { return next(); }

        options.meta = util.merge(
            selleck.getMetadata(config.theme, 'theme', true),
            selleck.getMetadata(projectPath, 'project', true)
        );

        options.layouts = util.merge(
            selleck.getLayouts(config.theme),
            selleck.getLayouts(projectPath)
        );

        options.partials = util.merge(
            selleck.getPartials(config.theme),
            selleck.getPartials(projectPath)
        );

        selleck.prepare(docPath, options, function (err, options, compiled) {
            if (err) { return next(err); }

            var view   = new selleck.ComponentView(options.meta, pageName),
                layout = options.layouts[view.layout];

            selleck.render(page, view, layout, options.partials, function (err, html) {
                if (err) {
                    throw new Error(err.message);
                }

                res.header('Content-Type: text/html;charset=utf-8');
                res.send(html);
            });
        });
    });

    // Redirect component requests that don't have a trailing slash.
    app.get(/^\/([\w\-]+)$/, function (req, res) {
        res.redirect('/' + req.params[0] + '/', 302);
    });

    // Handle 404s.
    app.get('*', function (req, res) {
        res.send('<html><head><title>404 Not Found</title></head>' +
            '<body><h1>Not Found</h1><p>The requested URL was not found.</p>', 404);
    });

    app.listen(config.serverPort || 3000);

    selleck.log('Selleck is now giving Ferrari rides at http://localhost:' +
            (config.serverPort || 3000), 'info');
};
