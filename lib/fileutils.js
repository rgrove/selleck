var fs       = require('fs'),
    fsPath   = require('path'),
    nodeUtil = require('util');

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
function copyPath() {
    var args        = Array.prototype.slice.call(arguments),
        callback    = args.pop(),
        source      = args.shift(),
        dest        = args.shift(),
        overwrite   = args.shift(),

        destStats   = statSync(dest),
        sourceStats = statSync(source),
        filename, files, filesRemaining;

    if (!sourceStats) {
        callback(new Error("Source not found: " + source));
        return;
    }

    if (sourceStats.isFile()) {
        if (destStats) {
            if (overwrite) {
                deletePath(dest);
            } else {
                callback(new Error("Destination already exists: " + dest));
                return;
            }
        }

        nodeUtil.pump(fs.createReadStream(source),
                fs.createWriteStream(dest, {mode: 0655}), callback);

    } else if (sourceStats.isDirectory()) {
        if (destStats) {
            if (destStats.isFile()) {
                if (overwrite) {
                    deletePath(dest);
                    fs.mkdirSync(dest, 0755);
                } else {
                    callback(new Error("Destination already exists: " + dest));
                    return;
                }
            }
        } else {
            fs.mkdirSync(dest, 0755);
        }

        files = fs.readdirSync(source);
        filesRemaining = files.length;

        while ((filename = files.shift())) {
            copyPath(fsPath.join(source, filename),
                    fsPath.join(dest, filename), overwrite, function (err) {

                if (err) { callback(err); return; }

                filesRemaining -= 1;

                if (!filesRemaining) {
                    callback();
                }
            });
        }

    } else {
        callback(new Error("Source is neither a file nor a directory: " + source));
        return;
    }
}
exports.copyPath = copyPath;

/**
If _path_ is a file, deletes it. If _path_ is a directory, recursively deletes
it and all files and directories it contains.

This method is synchronous.

@method deletePath
@param {String} path File or directory to delete.
**/
function deletePath(path) {
    var stats = fs.statSync(path);

    if (stats.isFile()) {
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
@method isFile
**/
function isFile(path) {
    var stats = statSync(path);
    return stats ? stats.isFile() : false;
}
exports.isFile = isFile;

/**
@method isDirectory
**/
function isDirectory(path) {
    var stats = statSync(path);
    return stats ? stats.isDirectory() : false;
}
exports.isDirectory = isDirectory;

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
