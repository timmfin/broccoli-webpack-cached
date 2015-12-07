'use strict';

var RSVP = require('rsvp');
var path = require('path');
var mkdirp = require('mkdirp');
var webpack = require('webpack');
var Plugin = require('broccoli-plugin');
var symlinkOrCopySync = require('symlink-or-copy').sync;

var PreventResolveSymlinkPlugin = require('./prevent-resolve-symlink-plugin');

function WebpackFilter(inputNode, options) {
  if (!(this instanceof WebpackFilter)) return new WebpackFilter(inputNode, options);

  if (Array.isArray(inputNode)) {
    throw new Error("WebpackFilter only accepts a single inputNode");
  }

  Plugin.call(this, [inputNode], {
    annotation: options.annotation
  });
  this.options = options;
}

WebpackFilter.prototype = Object.create(Plugin.prototype);
WebpackFilter.prototype.constructor = WebpackFilter;


// "private" helpers

function ensureArray(potentialArray) {
  if (typeof potentialArray === 'string') {
    return [potentialArray];
  } else {
    return potentialArray || [];
  }
}


WebpackFilter.prototype.initializeCompiler = function() {
  if (this.options.context) throw new Error("WebpackFilter will set the webpack context, you shouldn't set it.");
  if (this.options.cache) throw new Error("WebpackFilter will set the webpack cache, you shouldn't set it.");
  if (this.options.output && this.options.output.path) throw new Error("WebpackFilter will set the webpack output.path, you shouldn't set it.");

  var resp, cwd;

  // Input tree path from broccoli
  this.options.context = this.inputPaths[0];

  // Tell Webpack to write to this plugin's cache folder
  this.options.output = this.options.output || {};
  this.options.output.path = this.cachePath;

  // Change our working directory so resolve.modulesDirectories searches the
  // latest broccoli piped version of our project rather than the original copies on disk.
  cwd = process.cwd();
  process.chdir(this.inputPaths[0]);

  // Make the input dir a root to lookup modules
  this.options.resolve = this.options.resolve || {};
  this.options.resolve.root = ensureArray(this.options.resolve.root);
  this.options.resolve.root.push(this.inputPaths[0]);

  // Make the original source's node_modules dir a place to lookup loaders
  this.options.resolveLoader = this.options.resolveLoader || {};
  this.options.resolveLoader.root = ensureArray(this.options.resolveLoader.root);
  this.options.resolveLoader.root.push(path.join(cwd, 'node_modules'));


  // Let webpack do all the caching (we will call webpack's compile method every
  // build and rely on it to only build what is necessary)
  this.options.cache = this._webpackCache = {};

  // By default, log webpack's output to the console
  this.options.logStats = (this.options.logStats === undefined) ? true : this.options.logStats;

  // Prevent Webpack's ResultSymlinkPlugin from breaking relative paths in symlinked
  // modules (a common problem with Broccoli's highly symlinked output trees).
  // This is on by default, but can be disabled.
  if (this.options.preventSymlinkResolution === true || this.options.preventSymlinkResolution === undefined)  {
    this.options.plugins = this.options.plugins || [];
    this.options.plugins.push(
      new webpack.ResolverPlugin([PreventResolveSymlinkPlugin])
    );
  }

  // Run webpack
  resp = webpack(this.options);

  // Switch back to original working directory
  process.chdir(cwd);
  return resp;
}

WebpackFilter.prototype.build = function() {
  if (this.compiler === undefined) {
    this.compiler = this.initializeCompiler();
  }

  var that = this;

  return new RSVP.Promise(function(resolve, reject) {
    that.compiler.run(function(err, stats) {

      // If there is a Webpack error (hard OR soft error), show it and reject
      if(err) {
        console.error('Webpack error in', err.module.rawRequest);

        // Broccoli will log this custom error message itself
        var error = new Error(err.message + (err.details ? '\n' + err.details : ''));

        // TODO, fill in these error properties?
        // file: Path of the file in which the error occurred, relative to one of the inputPaths directories
        // treeDir: The path that file is relative to. Must be an element of this.inputPaths. (The name treeDir is for historical reasons.)
        // line: Line in which the error occurred (one-indexed)
        // column: Column in w

        reject(error);
      } else if (stats.compilation && stats.compilation.errors && stats.compilation.errors.length) {

        var allErrorMessages = stats.compilation.errors.map(function(err) {
          return err.message + (err.details ? '\n' + err.details : '');
        }).join('\n\n');

        // Broccoli will log this custom error message itself
        if (stats.compilation.errors.length == 1) {
          var error = new Error('Webpack build failure:\n' + allErrorMessages);
        } else {
          var error = new Error('Webpack build failures (' + stats.compilation.errors.length + '):\n' + allErrorMessages);
        }

        reject(error);
      } else {

        // If we finished, show the logging we want to see
        var jsonStats = stats.toJson();
        if (that.options.logStats) console.log("\n[webpack]", stats.toString(that.options.logStats));
        if (jsonStats.errors.length > 0) jsonStats.errors.forEach(console.error);
        if (jsonStats.warnings.length > 0) jsonStats.warnings.forEach(console.warn);

        // Get all of the assets from webpack, both emitted in this current compile
        // pass and not emitted (aka, cached). And then symlink all of them from the
        // cache folder (where webpack writes) to the output folder
        jsonStats.assets.map(function(asset) {
          mkdirp.sync(path.dirname(that.outputPath + '/' + asset.name));
          symlinkOrCopySync(that.cachePath + '/' + asset.name, that.outputPath + '/' + asset.name);
        });

        resolve();
      }

    });
  });
};

module.exports = WebpackFilter;
