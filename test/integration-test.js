var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var assert = require('chai').assert
var broccoli = require('broccoli');

function getBuilderForFixture(fixture) {
  var fixturePath = path.join(__dirname, 'fixtures', fixture);
  process.chdir(fixturePath);

  var node = broccoli.loadBrocfile();
  return new broccoli.Builder(node);
}

var filesThatShouldExist = [
  'extra.bundle.js',
  'one-bundle.js',
  'one.css',
  'one.html',
  'requireTest-bundle.js',
  'two-bundle.js',
  'two.css',
  'two.html'
];

describe('broccoli-webpack-cached', function() {
  this.timeout(5000);

  describe('kitchen sink integration test', function() {
    var builder,
        buildPromise;

    before(function() {
      builder = getBuilderForFixture('kitchen-sink');
      buildPromise = builder.build();
    });

    it('should build the first time and have all necessary files', function() {
      return buildPromise = buildPromise.then(function(result) {
        filesThatShouldExist
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(fs.statSync)
          .map(assert.ok);

      })
    });

    it('should build a second time and have all necessary files', function() {
      return buildPromise = builder.build().then(function(result) {
        filesThatShouldExist
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(fs.statSync)
          .map(assert.ok);

      })
    });

    it('should build a third time and have all necessary files', function() {
      return buildPromise = builder.build().then(function(result) {
        filesThatShouldExist
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(fs.statSync)
          .map(assert.ok);

      })
    });

    after(function() {
      return builder.cleanup()
    })
  });
});
