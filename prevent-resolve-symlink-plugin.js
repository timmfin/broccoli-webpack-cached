// This plugin will prevent the ResultSymlinkPlugin result plugin from running, so
// that modules that are symlinks are _not_ resolved to their absolute file
// location. This is necessary to make Broccoli's  heavily symlinked output trees
// work with Webpack (otherwise relative module paths inside symlinked modules would
// break)
var PreventResolveSymlinkPlugin = {
  apply: function(compiler) {
    compiler.plugin("after-resolvers", function(compiler) {
      function onlyNotResultSymlinkPluginFuncs(func) {
        return func.toString().indexOf('resolved symlink to') === -1;
      }

      compiler.resolvers.normal._plugins.result = compiler.resolvers.normal._plugins.result.filter(onlyNotResultSymlinkPluginFuncs);
      compiler.resolvers.context._plugins.result = compiler.resolvers.normal._plugins.result.filter(onlyNotResultSymlinkPluginFuncs);
    });
  }
};

module.exports = PreventResolveSymlinkPlugin;
