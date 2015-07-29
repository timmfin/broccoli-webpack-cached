
Yet another webpack plugin for Broccoli. This one relies on webpack's caching, but does it in a way that works well as a broccoli plugin (letting webpack write to the cache folder and then symlinking from that to the final output folder as needed).

This means it should be fast _and_ compatible with other Broccoli plugins (unlike [myfreeweb/broccoli-webpack](https://github.com/myfreeweb/broccoli-webpack) and [rafales/broccoli-webpack-fast](https://github.com/rafales/broccoli-webpack-fast))

### Using

Inside your `Brocfile.js`:

```js
var mergeTrees = require('broccoli-merge-trees');
var WebpackFilter = require('broccoli-webpack-cached');

// ... other Broccoli plugins that buildup inputTree

// WebpackFilter
//
//   - First argument is a single inputTree (not an array)
//   - Second argument is a webpack options object. Note you _cannot_ pass the `context`,
//     `cache`, or `output` options (because this plugin will set them for you).
//
var webpackModulesTree = WebpackFilter(inputTree, {
  // Random example of webpack configuration ...
  entry: {
    one: "./entry.js",
    two: "./entry2.js",
  },

  output: {
    filename: "[name]-bundle.js",
    chunkFilename: "[id]-chunk-bundle.js"
  },

  externals: {
    jquery: 'jQuery'
  },

  devtool: 'cheap-module-inline-source-map',

  plugins: [
    new webpack.optimize.CommonsChunkPlugin("extra.bundle.js"),

    // Use the plugin to specify the resulting filename (and add needed behavior to the compiler)
    new ExtractTextPlugin("[name].css", {
      allChunks: false
    })
  ],

  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loaders: ["source-map-loader", "/Users/tfinley/src/brocpack-tester/directive-loader.js"]
      }
    ],

    loaders: [{
      test: /\.css$/,
      loader: ExtractTextPlugin.extract("style-loader", "css-loader?sourceMap")
    }]
  }
});

// .. other Broccoli plugins that consume webpack Tree

module.exports = mergeTrees([otherOutputTree, webpackModulesTree]);

```
