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


WebpackFilter.prototype.initializeCompiler = function() {
  if (this.options.context) throw new Error("WebpackFilter will set the webpack context, you shouldn't set it.");
  if (this.options.cache) throw new Error("WebpackFilter will set the webpack cache, you shouldn't set it.");
  if (this.options.output && this.options.output.path) throw new Error("WebpackFilter will set the webpack output.path, you shouldn't set it.");

  this.options.context = this.inputPaths[0];
  this.options.output = this.options.output || {};
  this.options.output.path = this.cachePath;

  // Make the input dir a root to lookup modules
  this.options.resolve = this.options.resolve || {};

  if (typeof this.options.resolve.root === 'string') {
    this.options.resolve.root = [this.options.resolve.root];
  } else {
    this.options.resolve.root = this.options.resolve.root || [];
  }

  this.options.resolve.root.push(this.inputPaths[0]);

  // Let webpack do all the caching (we will call webpack's compile method every
  // build and rely on it to only build what is necessary)
  this.options.cache = this._webpackCache = {};

  // By default, log webpack's output to the console
  this.options.logStats = this.options.logStats || true;

  // Prevent Webpack's ResultSymlinkPlugin from breaking relative paths in symlinked
  // modules (a common problem with Broccoli's highly symlinked output trees).
  // This is on by default, but can be disabled.
  if (this.options.preventSymlinkResolution === true || this.options.preventSymlinkResolution === undefined)  {
    this.options.plugins = this.options.plugins || [];
    this.options.plugins.push(
      new webpack.ResolverPlugin([PreventResolveSymlinkPlugin])
    );
  }

  return webpack(this.options);
}

WebpackFilter.prototype.build = function() {
  if (this.compiler === undefined) {
    this.compiler = this.initializeCompiler();
  }

  var that = this;

  return new RSVP.Promise(function(resolve, reject) {
    that.compiler.run(function(err, stats) {
      var jsonStats = stats.toJson();

      if (that.options.logStats) {
        var loggingOptions;

        // Allow options.logStats to be a string or object that is passed to
        // stats.toString(). More info in:
        //   - http://webpack.github.io/docs/node.js-api.html#stats-tostring
        //   - https://github.com/webpack/webpack/pull/1323
        if (that.options.logStats === true) {
          loggingOptions = 'verbose';
        } else {
          loggingOptions = that.options.logStats;
        }

        console.log("\n[webpack]", stats.toString(loggingOptions));
      }

      if (jsonStats.errors.length > 0) jsonStats.errors.forEach(console.error);
      if (jsonStats.warnings.length > 0) jsonStats.warnings.forEach(console.warn);
      if (err || jsonStats.errors.length > 0) {
        reject(err);
      } else {
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
