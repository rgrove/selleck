/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

/**
@module selleck
**/

var fs         = require('graceful-fs'),
    path       = require('path'),
    Handlebars = require('../support/handlebars/handlebars').Handlebars,

    fileutils  = require('./fileutils'),
    util       = require('./util'), // Selleck's util, not Node's util.

    ComponentView = exports.ComponentView = require('./view/component'),
    Higgins       = exports.Higgins       = require('./higgins'),
    View          = exports.View          = require('./view');

// -- Public Properties --------------------------------------------------------

/**
Path to the default theme directory.

@property defaultTheme
@type {String}
**/
exports.defaultTheme = path.join(__dirname, '..', 'themes', 'default');

// -- Public Functions ---------------------------------------------------------

/**
Copies static assets recursively from one directory to another.

@method copyAssets
@param {String} from Directory to copy from.
@param {String} to Directory to copy to.
@param {bool} [deleteFirst=false] If `true` and _to_ already exists, it (and all
  its contents) will be deleted first.
@param {callback}
  @param {Error} callback.err
**/
function copyAssets() {
    var args        = Array.prototype.slice.call(arguments),
        callback    = args.pop(),
        from        = args.shift(),
        to          = args.shift(),
        deleteFirst = args.shift();

    if (fileutils.isDirectory(from, true)) {
        if (deleteFirst && fileutils.isDirectory(to)) {
            fileutils.deletePath(to);
        }

        fileutils.copyPath(from, to, true, callback);
    } else {
        callback();
    }
}
exports.copyAssets = copyAssets;

/**
Creates the specified output directory if it doesn't already exist.

@method createOutputDir
@param {String} outDir Output directory.
**/
function createOutputDir(outDir) {
    var stats = fileutils.statSync(outDir);

    if (stats) {
        if (!stats.isDirectory()) {
            throw new Error('Output path already exists and is not a directory: ' + outDir);
        }
    } else {
        // TODO: mkdir -p
        fs.mkdirSync(outDir, 0755);
    }
}
exports.createOutputDir = createOutputDir;

/**
@method findDocs
@return {Object}
**/
function findDocs(dir, docs) {
    docs || (docs = {components: []});

    if (!fileutils.isDirectory(dir, true)) {
        log('Not a directory: ' + dir, 'error');
        return docs;
    }

    // TODO: implement a proper ignore list someday.
    if (path.basename(dir) === 'node_modules') {
        log('Ignoring node_modules dir: ' + dir, 'info');
        return docs;
    }

    if (isComponentDirectory(dir)) {
        docs.components.push({path: dir});
    } else if (isProjectDirectory(dir)) {
        if (docs.project) {
            log('Multiple projects found; ignoring ' + dir, 'warn');
        } else {
            docs.project = {path: dir};
        }
    } else {
        fs.readdirSync(dir).forEach(function (filename) {
            var filePath = path.join(dir, filename);

            // Skip hidden files and directories.
            if (filename.indexOf('.') === 0) { return; }

            if (fileutils.isDirectory(filePath, true)) {
                findDocs(filePath, docs);
            }
        });
    }

    return docs;
}
exports.findDocs = findDocs;

/**
@method generate
@param {String} inDir Input directory containing docs and assets to generate.
@param {Object} options Generation options.
@param {callback}
  @param {Error} callback.err
**/
function generate(inDir, options, callback) {
    prepare(inDir, options, function (err, options) {
        if (err) { return callback(err); }

        var out       = options.out,
            outAssets = options['out-assets'];

        // Append meta.name to the output path if this is a component.
        if (options.component) {
            out       = path.join(out, options.meta.name);
            outAssets = path.join(outAssets, options.meta.name);
        }

        createOutputDir(out);

        copyAssets(path.join(inDir, 'assets'), outAssets, function (err) {
            if (err) { return callback(err); }
            writePages(out, options, callback);
        });
    });
}
exports.generate = generate;

/**
@method getMetadata
**/
function getMetadata(dir, type, throwOnError) {
    var filePath = path.join(dir, type + '.json'),
        json, meta;

    if (fileutils.isFile(filePath)) {
        json = fs.readFileSync(filePath, 'utf8');

        try {
            meta = JSON.parse(json);
        } catch (ex) {
            log(filePath + ': JSON error: ' + ex.message, 'error');
            if (throwOnError) { throw ex; }
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
    return getPages(path.join(dir, 'layouts'));
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

    if (!fileutils.isDirectory(dir, true)) { return pages; }

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
    return getPages(path.join(dir, 'partials'));
}
exports.getPartials = getPartials;

/**
Returns `true` if _dir_ appears to be a Selleck component directory.

@method isComponentDirectory
@param {String} dir Directory.
@return {Boolean}
**/
function isComponentDirectory(dir) {
    var metaStats, indexStats;

    try {
        metaStats  = fs.statSync(path.join(dir, 'component.json'));
        indexStats = fs.statSync(path.join(dir, 'index.mustache'));
    } catch (ex) {
        return false;
    }

    return metaStats.isFile() && indexStats.isFile();
}
exports.isComponentDirectory = isComponentDirectory;

/**
Returns `true` if _dir_ appears to be a Selleck project directory.

@method isProjectDirectory
@param {String} dir Directory.
@return {Boolean}
**/
function isProjectDirectory(dir) {
    var metaStats, indexStats;

    try {
        metaStats  = fs.statSync(path.join(dir, 'project.json'));
        indexStats = fs.statSync(path.join(dir, 'index.mustache'));
    } catch (ex) {
        return false;
    }

    return metaStats.isFile() && indexStats.isFile();
}
exports.isProjectDirectory = isProjectDirectory;

/**
Logs a message to stdout or stderr, with an optional log level.

@method log 
@param {String} message A message to write to the console.
@param {String} [level] A short string describing the type of message. 
    If the level is 'error', Selleck logs the message to stderr. 
    Otherwise, Selleck logs the message to stdout.
    The default level is 'info'.
**/
function log(message, level) {
    if (level === 'error') {
        console.error('[error] ' + message);
    } else {
        console.log('[' + (level || 'info') + '] ' + message);
    }
}
exports.log = log;

/**
@method prepare
@param {String} inDir
@param {Object} options
@param {callback}
  @param {Error} err
  @param {Object} options Merged options.
**/
function prepare(inDir, options, callback) {
    var compiled = {},
        meta     = {},
        type     = options.component ? 'component' : 'project';

    if (options && options.skipLoad) {
        // Skip loading layouts, metadata, pages, and partials and assume that
        // the caller has provided them if they want them.
        options = util.merge({
            layouts  : {},
            meta     : {},
            pages    : {},
            partials : {},
            viewClass: options.component ? ComponentView : View
        }, options);
    } else {

        // Gather layouts, metadata, pages, and partials from the specified
        // input directory, then merge them into the provided options (if any).
        //
        // Gathered data will override provided data if there are conflicts, in
        // order to support a use case where global data are provided by the
        // caller and overridden by more specific component-level data gathered
        // from the input directory.
        //
        // The metadata inheritance chain looks like this:
        //
        //   - override metadata specified via CLI (highest precedence)
        //   - component metadata (if this is a component)
        //   - project-level component default metadata (if specified and this is a component)
        //   - theme-level component default metadata (if specified and this is a component)
        //   - project metadata
        //   - theme metadata (lowest precedence)

        if (options.component && options.meta && options.meta.componentDefaults) {
            meta = options.meta.componentDefaults;
        }

        try {
            options = util.merge(
                {viewClass: options.component ? ComponentView : View},
                options || {},
                {
                    layouts : getLayouts(inDir),
                    meta    : util.merge(meta, getMetadata(inDir, type, true)),
                    partials: getPartials(inDir)
                }
            );
        } catch (ex) {
            return callback(ex);
        }
    }

    // Pages are never merged.
    options.pages = getPages(inDir);

    // Mix in the override metadata, if any. It takes precedence over everything
    // else.
    util.mix(options.meta, options.overrideMeta);

    if (options.component && options.overrideMeta && options.overrideMeta.componentDefaults) {
        util.mix(options.meta, options.overrideMeta.componentDefaults);
    }

    // Set a default asset path if one isn't specified in the metadata.
    if (!options.meta.projectAssets) {
        options.meta.projectAssets = options.component ? '../assets' : 'assets';
    }

    if (!options.meta.componentAssets && options.component) {
        options.meta.componentAssets = '../assets/' + options.meta.name;
    }

    // If a validator function was provided, run it.
    if (options.validator && options.validator(options, inDir) === false) {
        return callback(new Error('Validation failed.')); // TODO: get the error from the validator itself
    }

    if (typeof options.meta.layout === 'undefined') {
        options.meta.layout = options.layouts[type] ? type : 'main';
    }

    callback(null, options);
}
exports.prepare = prepare;

/**
Renders the specified template source.

@method render
@param {String} source Template source to render.
@param {Object} view View object.
@param {String} [layout] Layout template to use.
@param {Object} [partials] Partials object.
@param {callback}
  @param {Error} err
  @param {String} html Rendered HTML.
**/
function render(source, view, layout, partials, callback) {
    var html, template;

    // Allow callback as third or fourth param.
    if (typeof partials === 'function') {
        callback = partials;
        partials = {};
    } else if (typeof layout === 'function') {
        callback = layout;
        layout = null;
    }

    function escapeDelimiters(str) {
        return str && str.replace(/\\{{/g, '__SELLECK_ESCAPED_LD__').
                   replace(/\\}}/g, '__SELLECK_ESCAPED_RD__');
    }

    function unescapeDelimiters(str) {
        return str && str.replace(/__SELLECK_ESCAPED_LD__/g, '{{').
                   replace(/__SELLECK_ESCAPED_RD__/g, '}}');
    }

    source = escapeDelimiters(source);
    layout = escapeDelimiters(layout);

    partials = util.merge(partials || {});

    util.each(partials, function (source, name) {
        partials[name] = escapeDelimiters(source);
    });

    try {
        if (layout) {
            template = Handlebars.compile(layout);
            partials = util.merge(partials || {}, {layout_content: source});
        } else {
            template = Handlebars.compile(source);
        }

        html = template(view, {partials: partials});
    } catch (ex) {
        return callback(ex);
    }

    html = unescapeDelimiters(html);

    callback(null, Higgins.render(html));
}
exports.render = render;

/**
@method writePages
**/
function writePages(outDir, options, callback) {
    var ext     = options['out-ext'],
        toWrite = util.size(options.pages);

    if (!toWrite) { return callback(); }

    // Render each page to HTML and write it to the output directory.
    util.each(options.pages, function (source, name) {
        var view   = new options.viewClass(options.meta, name),
            layout = options.layouts[view.layout];

        render(source, view, layout, options.partials, function (err, html) {
            if (err) { return callback(err); }

            if (options.dumpViews) {
                fs.writeFile(path.join(outDir, name + '.json'),
                        JSON.stringify(view, null, 2), 'utf8');
            }

            fs.writeFile(path.join(outDir, name + ext), html, 'utf8', finish);
        });
    });

    function finish(err) {
        if (err) { return callback(err); }

        if (!(toWrite -= 1)) {
            callback();
        }
    }
}
exports.writePages = writePages;
