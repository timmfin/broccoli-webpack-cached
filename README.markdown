
Yet another webpack plugin for Broccoli. This one relies on webpack's caching, but does it in a way that works well as a broccoli plugin (letting webpack write to the cache folder and then symlinking from that to the final output folder as needed).

This means it should be fast _and_ compatible with other Broccoli plugins (unlike [myfreeweb/broccoli-webpack](https://github.com/myfreeweb/broccoli-webpack) and [rafales/broccoli-webpack-fast](https://github.com/rafales/broccoli-webpack-fast))

Note, internally this uses the [PreventResolveSymlinkPlugin](./prevent-resolve-symlink-plugin.js) to prevent Webpack's symlink resolution behavior from breaking relative paths inside of symlinked modules. But you can disable that by passing in the `preventSymlinkResolution: false` option (some context in [this thread](https://github.com/webpack/webpack/issues/554#issuecomment-135797738)).

### Using

Inside your `Brocfile.js`:

```js
var webpack = require('webpack');
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

  // What seemed like the best option/tradeoff for faster but working source maps (at least for me)
  devtool: 'cheap-module-inline-source-map',

  plugins: [
    new webpack.optimize.CommonsChunkPlugin("extra.bundle.js"),
    new ExtractTextPlugin("[name].css", {
      allChunks: false
    })
  ],

  module: {
    preLoaders: [
      {
        // Use the source-map-loader to pass along source maps from earlier Broccoli plugins (they
        // should be inline source maps)
        test: /\.js$/,
        loaders: ["source-map-loader"]
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
