/**
 * This loader allows loading iframes specifically for this project. The iframes are
 * loaded in such a way that they can use typescript content and such content is then
 * compiled and attached as a data-uri
 *
 * This way, each iframe is self contained and isolated so it can be used in the final
 * application as a single entity and allow applications to sign transactions inside these
 * sandboxed and isolated iframes.
 */
const parser = require("node-html-parser");
const webpack = require("webpack");
const fs = require("fs");
const path = require("path");

const compileTypescriptFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const name = path.basename(filePath.replace(/\.ts$/, ""));
    const resultPath = path.resolve(__dirname, "lib");
    webpack(
      {
        mode: "production",
        entry: {
          [name]: filePath,
        },
        output: {
          path: resultPath,
          filename: "[name].js",
          libraryTarget: "umd",
          library: "MyLib",
          umdNamedDefine: true,
        },
        resolve: {
          extensions: [".ts", ".js"],
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              use: [
                {
                  loader: "babel-loader",
                },
                {
                  loader: "ts-loader",
                  options: {
                    compilerOptions: {
                      module: "ES2015",
                      target: "ES5",
                      moduleResolution: "node",
                      declaration: false,
                      lib: ["es2016", "dom", "es5"],
                      sourceMap: true,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      (error, stats) => {
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
      }
    );
  });
};

const handleScripts = async (content, baseDir, asDataUrl = false) => {
  const document =
    content instanceof parser.HTMLElement
      ? content
      : parser.parse(content.toString("utf-8"));
  const scripts = document.querySelectorAll("script");
  for (const script of scripts) {
    if (script.getAttribute("type") === "text/prs.typescript") {
      const absolutePath = path.resolve(baseDir, script.getAttribute("src"));
      script.setAttribute("type", "application/javascript");
      // Compile typescript
      const compiled = await compileTypescriptFile(absolutePath);
      // Replace the src with a data uri
      script.setAttribute(
        "src",
        `data:application/javascript;base64,${compiled.toString("base64")}`
      );
    }
  }
  const html = document.removeWhitespace().toString();
  if (asDataUrl) {
    const buffer = Buffer.from(html);
    return `data:text/html;base64,${buffer.toString("base64")}`;
  } else {
    return html;
  }
};

module.exports = function (content, map, meta) {
  const callback = this.async();
  const loader = async () => {
    const document = parser.parse(content);
    // Get all iframes (there will be just 1)
    const frames = document.querySelectorAll("iframe");
    const baseDir = path.dirname(this.resource);
    for (const frame of frames) {
      const src = frame.getAttribute("src");
      // Now try to read the file
      const url = await handleScripts(
        fs.readFileSync(path.resolve(baseDir, src)),
        baseDir,
        true
      );
      // Replace the src attribute with a data url
      frame.setAttribute("src", url);
    }
    return handleScripts(document, baseDir);
  };
  loader()
    .then((result) => {
      callback(null, result, map, meta);
    })
    .catch((error) => {
      console.log(error);
    });
};
