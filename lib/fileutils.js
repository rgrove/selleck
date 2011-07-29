/*
Selleck
Copyright (c) 2011 Yahoo! Inc.
Licensed under the BSD License.
*/

var fs       = require('fs'),
    fsPath   = require('path'),
    nodeUtil = require('util');

/**
@method copyDirectory
**/
function copyDirectory(source, dest, overwrite, callback) {
    // Allow callback as third arg.
    if (typeof overwrite === 'function') {
        callback = overwrite;
        overwrite = null;
    }

    fs.stat(source, afterSourceStat);

    function afterSourceStat(err, stats) {
        if (err) { return callback(err); }

        if (!stats.isDirectory()) {
            return callback(new Error("Source is not a directory: " + source));
        }

        fs.lstat(dest, afterDestStat);
    }

    function afterDestStat(err, stats) {
        if (err && err.code !== 'ENOENT') { return callback(err); }

        if (stats) {
            // If the destination is a file or a link, either delete it or
            // bubble an error if overwrite isn't true.
            if (stats.isFile() || stats.isSymbolicLink()) {
                if (overwrite) {
                    deletePath(dest); // TODO: make this async
                } else {
                    callback(new Error("Destination already exists: " + dest));
                    return;
                }
            }

            afterMkDir();
        } else {
            fs.mkdir(dest, 0755, afterMkDir);
        }
    }

    function afterMkDir(err) {
        if (err && err.code !== 'EEXIST') { return callback(err); }
        fs.readdir(source, afterReadDir);
    }

    function afterReadDir(err, files) {
        if (err) { return callback(err); }

        var pending = files.length,
            filename;

        while ((filename = files.shift())) {
            copyPath(fsPath.join(source, filename), fsPath.join(dest, filename), overwrite, function (err) {
                if (err) { return callback(err); }

                pending -= 1;

                if (!pending) {
                    callback();
                }
            });
        }
    }
}
exports.copyDirectory = copyDirectory;

/**
@method copyFile
**/
function copyFile(source, dest, overwrite, callback) {
    // Allow callback as third arg.
    if (typeof overwrite === 'function') {
        callback = overwrite;
        overwrite = null;
    }

    fs.lstat(source, function (err, sourceStats) {
        if (err) { return callback(err); }

        if (!sourceStats.isFile()) {
            return callback(new Error("Source is not a file: " + source));
        }

        fs.lstat(dest, function (err, destStats) {
            if (err && err.code !== 'ENOENT') { return callback(err); }

            if (destStats) {
                if (overwrite) {
                    deletePath(dest); // TODO: make this async
                } else {
                    callback(new Error("Destination already exists: " + dest));
                    return;
                }
            }

            nodeUtil.pump(fs.createReadStream(source),
                    fs.createWriteStream(dest, {mode: 0655}), callback);
        });
    });
}
exports.copyFile = copyFile;

/**
If _source_ is a file, copies it to _dest_. If it's a directory, recursively
copies it and all files and directories it contains to _dest_.

Note that when attempting to copy a file into a directory, you should specify
the full path to the new file (including the new filename). Otherwise, it will
be interpreted as an attempt to copy the _source_ file *over* the _dest_
directory instead of *into* it.

Known issues:
- Doesn't preserve ownership or permissions on copied files/directories.

@method copyPath
@param {String} source Source path.
@param {String} dest Destination path.
@param {Boolean} [overwrite=false] Whether or not to overwrite destination files
  if they already exist.
@param {callback}
  @param {Error} err
**/
function copyPath(source, dest, overwrite, callback) {
    var destStats   = statSync(dest),
        sourceStats = statSync(source);

    // Allow callback as third arg.
    if (typeof overwrite === 'function') {
        callback = overwrite;
        overwrite = null;
    }

    if (!sourceStats) {
        callback(new Error("Source not found: " + source));
        return;
    }

    if (sourceStats.isFile()) {
        copyFile(source, dest, overwrite, callback);
    } else if (sourceStats.isDirectory()) {
        copyDirectory(source, dest, overwrite, callback);
    } else {
        callback(new Error("Source is neither a file nor a directory: " + source));
    }
}
exports.copyPath = copyPath;

// TODO: copySymbolicLink()?

/**
If _path_ is a file, deletes it. If _path_ is a directory, recursively deletes
it and all files and directories it contains.

This method is synchronous.

@method deletePath
@param {String} path File or directory to delete.
**/
function deletePath(path) {
    var stats = fs.lstatSync(path);

    if (stats.isFile() || stats.isSymbolicLink()) {
        fs.unlinkSync(path);
    } else if (stats.isDirectory()) {
        fs.readdirSync(path).forEach(function (filename) {
            deletePath(fsPath.join(path, filename));
        });

        fs.rmdirSync(path);
    }
}
exports.deletePath = deletePath;

/**
@method isDirectory
**/
function isDirectory(path, allowSymLink) {
    var stats = (allowSymLink ? statSync : lstatSync)(path);
    return stats ? stats.isDirectory() : false;
}
exports.isDirectory = isDirectory;

/**
@method isFile
**/
function isFile(path) {
    var stats = lstatSync(path);
    return stats ? stats.isFile() : false;
}
exports.isFile = isFile;

/**
@method isSymbolicLink
**/
function isSymbolicLink(path) {
    var stats = lstatSync(path);
    return stats ? stats.isSymbolicLink() : false;
}
exports.isSymbolicLink = isSymbolicLink;

/**
Like `fs.lstatSync()`, but returns `null` instead of throwing when _path_
doesn't exist. Will still throw on other types of errors.

@method lstatSync
@param {String} path Path to stat.
@return {fs.Stats|null} `fs.Stats` object, or `null` if _path_ doesn't exist.
**/
function lstatSync(path) {
    try {
        return fs.lstatSync(path);
    } catch (ex) {
        if (ex.code === 'ENOENT') {
            return null;
        }

        throw ex;
    }
}
exports.lstatSync = lstatSync;

/**
Like `fs.statSync()`, but returns `null` instead of throwing when _path_
doesn't exist. Will still throw on other types of errors.

@method statSync
@param {String} path Path to stat.
@return {fs.Stats|null} `fs.Stats` object, or `null` if _path_ doesn't exist.
**/
function statSync(path) {
    try {
        return fs.statSync(path);
    } catch (ex) {
        if (ex.code === 'ENOENT') {
            return null;
        }

        throw ex;
    }
}
exports.statSync = statSync;
