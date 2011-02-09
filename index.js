var fs        = require('fs'),
    path      = require('path'),
    mustache  = require('mustache'),
    fileutils = require('./lib/fileutils'),
    util      = require('./lib/util'); // Selleck util, not Node util.

exports.View          = require('./lib/view');
exports.ComponentView = require('./lib/view/component');

/**
@property defaultTemplate
@type {String}
**/
exports.defaultTemplate = path.join(__dirname, 'template', 'default');

/**
@method findDocPaths
**/
function findDocPaths(root) {
    var paths = [];

    if (!fileutils.isDirectory(root)) {
        log('Not a directory: ' + root, 'warning');
    }

    fs.readdirSync(root).forEach(function (filename) {
        var filePath = path.join(root, filename);

        // Skip hidden files and directories.
        if (filename.indexOf('.') === 0) { return; }

        if (fileutils.isDirectory(filePath)) {
            if (isDocDirectory(filePath)) {
                paths.push(filePath);
            } else {
                findDocPaths(filePath).forEach(function (p) {
                    paths.push(p);
                });
            }
        }
    });

    return paths;
}
exports.findDocPaths = findDocPaths;

/**
@method getMetadata
**/
function getMetadata(dir) {
    var filePath = path.join(dir, 'doc.json'),
        json, meta;

    if (fileutils.isFile(filePath)) {
        json = fs.readFileSync(filePath, 'utf8');

        try {
            meta = JSON.parse(json);
        } catch (ex) {
            log(filePath + ': JSON error: ' + ex.message, 'error');
        }
    }

    return meta || {};
}
exports.getMetadata = getMetadata;

/**
Like `getPages()`, but returns only the files under the `layout/` subdirectory
of the specified _dir_.

@method getLayouts
@param {String} dir Directory path.
@return {Object} Mapping of layout names to layout content.
**/
function getLayouts(dir) {
    return getPages(path.join(dir, 'layout'));
}
exports.getLayouts = getLayouts;

/**
Loads pages (files with a .mustache extension) in the specified directory and
returns an object containing a mapping of page names (the part of the filename)
preceding the .mustache extension) to page content.

@method getPages
@param {String} dir Directory path.
@return {Object} Mapping of page names to page content.
**/
function getPages(dir) {
    var pages = {};

    if (!fileutils.isDirectory(dir)) { return pages; }

    fs.readdirSync(dir).forEach(function (filename) {
        var filePath = path.join(dir, filename);

        if (path.extname(filename) === '.mustache' && fileutils.isFile(filePath)) {
            pages[path.basename(filename, '.mustache')] = fs.readFileSync(filePath, 'utf8');
        }
    });

    return pages;
}
exports.getPages = getPages;

/**
Like `getPages()`, but returns only the files under the `partial/` subdirectory
of the specified _dir_.

@method getPartials
@param {String} dir Directory path.
@return {Object} Mapping of partial names to partial content.
**/
function getPartials(dir) {
    return getPages(path.join(dir, 'partial'));
}
exports.getPartials = getPartials;

/**
@method isDocDirectory
**/
function isDocDirectory(dir) {
    var docStats,
        indexStats;

    try {
        docStats   = fs.statSync(path.join(dir, 'doc.json'));
        indexStats = fs.statSync(path.join(dir, 'index.mustache'));
    } catch (ex) {
        return false;
    }

    return docStats.isFile() && indexStats.isFile();
}
exports.isDocDirectory = isDocDirectory;

/**
@method log
**/
function log(message, level) {
    console.log('[' + (level || 'info') + '] ' + message);
}
exports.log = log;

/**
@method render
**/
function render(content, view, partials, sendFunction) {
    if (view.layout) {
        return mustache.to_html(view.layout, view,
                util.merge(partials || {}, {layout_content: content}),
                sendFunction);
    } else {
        return mustache.to_html(content, view, partials || {}, sendFunction);
    }
}
exports.render = render;
