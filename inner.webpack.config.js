const loaders = { iframe: "./iframe-loader.js" };
const options = require("./tsconfig.json");
const globalWebpackConfig = require("./webpack.config");

module.exports = (name, filePath, resultPath) => ({
  ...globalWebpackConfig,
  entry: {
    [name]: filePath,
  },
  output: {
    path: resultPath,
    ...globalWebpackConfig.output,
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ["html-loader", loaders.iframe],
      },
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
                ...options.compilerOptions,
              },
            },
          },
        ],
      },
    ],
  },
});
