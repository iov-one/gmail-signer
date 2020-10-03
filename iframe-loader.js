/**
 * This loader allows loading iframes specifically for this project. The iframes are
 * loaded in such a way that they can use typescript content and such content is then
 * compiled and attached as a data-uri
 *
 * This way, each iframe is self contained and isolated so it can be used in the final
 * application as a single entity and allow applications to sign transactions inside these
 * sandboxed and isolated iframes.
 */
const cheerio = require("cheerio");
const webpackConfig = require("./inner.webpack.config");
const webpack = require("webpack");
const fs = require("fs");
const path = require("path");

const compileTypescriptFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const name = path.basename(filePath.replace(/\.ts$/, ""));
    const resultPath = path.resolve(__dirname, "lib");
    webpack(webpackConfig(name, filePath, resultPath), (error, stats) => {
      if (error) {
        reject(error);
      } else if (stats.hasErrors()) {
        reject(stats);
      } else {
        // FIXME: show stats
        const temporaryPath = path.join(resultPath, `${name}.js`);
        const contentBuffer = fs.readFileSync(temporaryPath);
        // Delete the temporary file
        fs.unlinkSync(temporaryPath);
        // Return ths script content
        resolve(contentBuffer);
      }
    });
  });
};

const handleScripts = async (content, baseDir) => {
  const document = cheerio.load(content);
  const script = document("script");
  // Wait to parse all the scripts
  if (script.attr("type") === "text/prs.typescript") {
    const absolutePath = path.resolve(baseDir, script.attr("src"));
    // Change the type of course
    script.attr("type", "application/javascript");
    // Compile typescript
    const compiled = await compileTypescriptFile(absolutePath);
    // Replace the src with a data uri
    script.removeAttr("src");
    // Write the script into the iframe, note that we don't
    // want the library to escape anything so we use the text
    // method
    script.text(compiled.toString());
  }
  return document;
};

const loader = function (content, map, meta) {
  const callback = this.async();
  const loader = async () => {
    // Get all iframes (there will be just 1)
    const document = await handleScripts(content, path.dirname(this.resource));
    // Now convert it to string
    return document.html();
  };
  loader()
    .then((result) => {
      callback(null, result, map, meta);
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = loader;
