var fs        = require('fs'),
    path      = require('path'),

    jsdom     = require('jsdom').jsdom,
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
@method generate
**/
function generate(inDir, outDir, options) {
    var assetsDir = path.join(inDir, 'assets'),
        outStats, pageName;

    if (options && options.skipLoad) {
        // Skip loading layouts, metadata, pages, and partials and assume that
        // the caller has provided them if they want them.
        options = util.merge({
            layouts : {},
            meta    : {},
            pages   : {},
            partials: {}
        }, options);
    } else {
        // Gather layouts, metadata, pages, and partials from the specified
        // input directory, then merge them into the provided options (if any).
        //
        // Gathered data will override provided data if there are conflicts, in
        // order to support a use case where global data are provided by the
        // caller and overridden by more specific component-level data gathered
        // from the input directory.
        options = util.merge(options || {}, {
            layouts  : getLayouts(inDir),
            meta     : getMetadata(inDir),
            pages    : getPages(inDir),
            partials : getPartials(inDir)
        });
    }

    // If a validator function was provided, run it, and skip the generation
    // step if it returns false.
    if (options.validator && options.validator(options) === false) {
        return false;
    }

    // Create a view instance if one wasn't provided in the options hash.
    if (!options.view) {
        if (options.component) {
            options.view = new exports.ComponentView(options.meta, {
                layout: options.layouts.component
            });
        } else {
            options.view = new exports.View(options.meta, {
                layout: options.layouts.main
            });
        }
    }

    // Append meta.name to the output directory if this is a component.
    if (options.component) {
        outDir = path.join(outDir, options.meta.name);
    }

    outStats = fileutils.statSync(outDir);

    // Create the output directory if it doesn't exist.
    if (outStats) {
        if (!outStats.isDirectory()) {
            throw new Error('Output path already exists and is not a directory: ' + outDir);
        }
    } else {
        // TODO: mkdir -p
        fs.mkdirSync(outDir, 0755);
    }

    // If the input directory contains an "assets" subdirectory, copy it to the
    // output directory. This is an async operation, but we don't really care
    // when it finishes, so we don't wait for it.
    if (fileutils.isDirectory(assetsDir)) {
        fileutils.copyPath(assetsDir, path.join(outDir, 'assets'), true, function () {});
    }

    // Render each page to HTML and write it to the output directory.
    for (pageName in options.pages) {
        fs.writeFileSync(path.join(outDir, pageName + '.html'),
                render(options.pages[pageName], options.view, options.partials));
    }

    return true;
}
exports.generate = generate;

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
Loads and returns the content of the specified page file.

@method getPage
@param {String} pagePath Path to a single `.mustache` page.
@return {String|null} Page content, or `null` if not found.
**/
function getPage(pagePath) {
    if (!fileutils.isFile(pagePath)) { return null; }
    return fs.readFileSync(pagePath, 'utf8');
}
exports.getPage = getPage;

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
function render(content, view, partials) {
    var html = [];

    function sendFunction(line) {
        html.push(line);
    }

    if (view.layout) {
        mustache.to_html(view.layout, view,
                util.merge(partials || {}, {layout_content: content}),
                sendFunction);
    } else {
        mustache.to_html(content, view, partials || {}, sendFunction);
    }

    return html.join('\n');
}
exports.render = render;
