// This plugin will prevent the ResultSymlinkPlugin result plugin from running, so
// that modules that are symlinks are _not_ resolved to their absolute file
// location. This is necessary to make Broccoli's  heavily symlinked output trees
// work with Webpack (otherwise relative module paths inside symlinked modules would
// break)
var PreventResolveSymlinkPlugin = {
  apply: function(resolver) {
    resolver.plugin('result', function(request, callback) {
      // Call the callback to prevent any other "result" plugins from running
      callback(null, request);
    });
  }
};

module.exports = PreventResolveSymlinkPlugin;
