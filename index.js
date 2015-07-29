'use strict';

var RSVP = require('rsvp');
var webpack = require('webpack');
var Plugin = require('broccoli-plugin');
var symlinkOrCopySync = require('symlink-or-copy').sync;


// Other broccoli webpack plugins (this hopes to replace):
//   - https://github.com/myfreeweb/broccoli-webpack
//   - https://github.com/rafales/broccoli-webpack-fast


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

  console.log('Webpack context:', this.inputPaths[0]);

  this.options.context = this.inputPaths[0];
  this.options.output = this.options.output || {};
  this.options.output.path = this.cachePath;

  // Let webpack do all the caching (we will call webpack's compile method every
  // build and rely on it to only build what is necessary)
  this.options.cache = this._webpackCache = {};

  this.compiler = webpack(this.options);
}

WebpackFilter.prototype.build = function() {
  if (this.compiler === undefined) {
    this.initializeCompiler();
  }

  var that = this;

  return new RSVP.Promise(function(resolve, reject) {
    that.compiler.run(function(err, stats) {
      var jsonStats = stats.toJson();
      if (jsonStats.errors.length > 0) jsonStats.errors.forEach(console.error);
      if (jsonStats.warnings.length > 0) jsonStats.warnings.forEach(console.warn);
      if (err || jsonStats.errors.length > 0) {
        reject(err);
      } else {
        // Get all of the assets from webpack, both emitted in this current compile
        // pass and not emitted (aka, cached). And then symlink all of them from the
        // cache folder (where webpack writes) to the output folder
        jsonStats.assets.map(function(asset) {
          symlinkOrCopySync(that.cachePath + '/' + asset.name, that.outputPath + '/' + asset.name);
        });

        resolve();
      }
    });
  });
};

module.exports = WebpackFilter;
