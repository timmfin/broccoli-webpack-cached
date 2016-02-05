var fs = require('fs');
var path = require('path');
var Promise = require('rsvp').Promise;
var expect = require('chai').expect;
var assert = require('chai').assert
var broccoli = require('broccoli');

function fixturePath(fixture, optionalSubpath) {
  var args = [__dirname, 'fixtures'].concat(Array.prototype.slice.call(arguments));
  return path.join.apply(path, args);
}

function getBuilderForFixture(fixture) {
  process.chdir(fixturePath(fixture));

  var node = broccoli.loadBrocfile();
  return new broccoli.Builder(node);
}

var oldContents = Object.create(null);

// Manually set mtime to the future (2secs) to get around second level mtime precision :/
function bumpMtime(filepath) {
  // var stat = fs.statSync(filepath);
  // console.log('Pre bump mtime for', filepath, fs.statSync(filepath).mtime);
  // fs.utimesSync(filepath, stat.atime, Math.floor((new Date).getTime() / 1000) + 2)
  // console.log('Bumped mtime for', filepath, fs.statSync(filepath).mtime, '(' + fs.statSync(filepath).mtime.getTime() + ')');
}

function saveContent(filepath) {
  var content = fs.readFileSync(filepath);

  if (oldContents[filepath] === undefined) {
    oldContents[filepath] = content;
  }

  return content;
}

function appendToFile(filepath, newContent) {
  var content = saveContent(filepath);

  fs.writeFileSync(filepath, content + newContent);
  bumpMtime(filepath);
}

function searchAndReplaceInFile(filepath, regexOrStringToMatch, replacement) {
  var content = saveContent(filepath);

  fs.writeFileSync(filepath, content.toString().replace(regexOrStringToMatch, replacement));
  bumpMtime(filepath);
}

function deleteFile(filepath) {
  saveContent(filepath);

  fs.unlinkSync(filepath);
  // console.log('deleted file', filepath);
}

function restoreFiles() {
  Object.keys(oldContents).forEach(function(filepath) {
    restoreFile(filepath);
  });
}

function restoreFile(filepath) {
  fs.writeFileSync(filepath, oldContents[filepath]);
  console.log('restored file', filepath, 'to', oldContents[filepath]);
  delete oldContents[filepath];
}

function restoreFileAndBumpMtime(filepath) {
  restoreFile(filepath);
  bumpMtime(filepath);
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

function logFileIfDesired(filepath) {
  // Keep the chain intact
  return filepath;
}


describe('broccoli-webpack-cached', function() {
  this.timeout(5000);

  describe('kitchen sink integration test', function() {
    var builder,
        buildPromise,
        webpackCompiler;

    before(function() {
      builder = getBuilderForFixture('kitchen-sink');
      buildPromise = builder.build();
    });

    it('should build the first time and have all necessary files', function() {
      return buildPromise = buildPromise.then(function(result) {

        // After first build save hackily passed through webpack compiler reference
        webpackCompiler = builder.tree.webpackCompiler;

        filesThatShouldExist
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
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
          .map(logFileIfDesired)
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
          .map(logFileIfDesired)
          .map(fs.statSync)
          .map(assert.ok);

      })
    });

    it('should build after adding a new line', function() {
      appendToFile(fixturePath('kitchen-sink', 'src/js/1.js'), 'console.log(\'new line added by INTEGRATION TEST\');\n');
      webpackCompiler.inputFileSystem.purge();

      return buildPromise = builder.build().then(function(result) {

        ['requireTest-bundle.js']
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
          .map(function(filepath) {
            expect(fs.readFileSync(filepath).toString()).to.contain('new line added by INTEGRATION TEST');
            return filepath;
          })
          .map(fs.statSync)
          .map(assert.ok);
      });
    });

    it('should build after removing that new line', function() {
      restoreFileAndBumpMtime(fixturePath('kitchen-sink', 'src/js/1.js'));
      webpackCompiler.inputFileSystem.purge();

      return buildPromise = builder.build().then(function(result) {

        ['requireTest-bundle.js']
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
          .map(function(filepath) {
            expect(fs.readFileSync(filepath).toString()).to.not.contain('new line added by INTEGRATION TEST');
            return filepath;
          })
          .map(fs.statSync)
          .map(assert.ok);
      });
    });

    it('should errro after removing a necessary file', function() {
      deleteFile(fixturePath('kitchen-sink', 'src/js/1.js'));
      webpackCompiler.inputFileSystem.purge();

      expect
      return buildPromise = builder.build().then(function(result) {
        throw new Error('This build should not succeed!');
      }).catch(function(error) {
        expect(error.code).to.equal('ENOENT');
        expect(error.path).to.equal('./src/js/1.js');
      });
    })

    it('should work again after bringing the file back', function() {
      restoreFileAndBumpMtime(fixturePath('kitchen-sink', 'src/js/1.js'));
      webpackCompiler.inputFileSystem.purge();

      return buildPromise = builder.build().then(function(result) {
        ['requireTest-bundle.js']
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
          .map(fs.statSync)
          .map(assert.ok);
      });
    })

    it('should work after removing a require dep', function() {
      searchAndReplaceInFile(fixturePath('kitchen-sink', 'src/js/combiner.js'), "require('./1.js')", "/* HIDDEN IN TEST: require('./1.js') */");
      webpackCompiler.inputFileSystem.purge();

      return buildPromise = builder.build().then(function(result) {
        ['requireTest-bundle.js']
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
          .map(function(filepath) {
            expect(fs.readFileSync(filepath).toString()).to.not.contain('console.log(1)');
            return filepath;
          })
          .map(fs.statSync)
          .map(assert.ok);
      });
    })

    it('should work after bringing require dep back', function() {
      restoreFileAndBumpMtime(fixturePath('kitchen-sink', 'src/js/combiner.js'));
      webpackCompiler.inputFileSystem.purge();

      return buildPromise = builder.build().then(function(result) {
        ['requireTest-bundle.js']
          .map(function(filename) {
            return path.join(result.directory, filename);
          })
          .map(logFileIfDesired)
          .map(function(filepath) {
            expect(fs.readFileSync(filepath).toString()).to.contain('console.log(1)');
            return filepath;
          })
          .map(fs.statSync)
          .map(assert.ok);
      });
    })

    after(function() {
      // console.log("Test cleanup");
      restoreFiles();
      return builder.cleanup()
    })
  });
});
