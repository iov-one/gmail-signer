const path = require("path");
const loaders = { iframe: path.resolve(__dirname, "iframe-loader.js") };

module.exports = {
  mode: "production",
  entry: {
    index: path.resolve(__dirname, "src/index.ts"),
    "index.min": path.resolve(__dirname, "src/index.ts"),
  },
  output: {
    path: path.resolve(__dirname, "lib"),
    filename: "[name].js",
    libraryTarget: "umd",
    umdNamedDefine: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
      {
        test: /\.html$/,
        use: ["html-loader", loaders.iframe],
      },
    ],
  },
  performance: {
    hints: false,
    maxEntrypointSize: 2097152,
    maxAssetSize: 2097152,
  },
};
