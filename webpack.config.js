const path = require("path");
const loaders = { iframe: path.resolve(__dirname, "iframe-loader.js") };

module.exports = {
  mode: "production",
  entry: {
    index: path.resolve(__dirname, "src/index.ts"),
    "index.min": path.resolve(__dirname, "src/index.ts"),
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "lib"),
    filename: "[name].js",
    libraryTarget: "umd",
    umdNamedDefine: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      frames: path.join(__dirname, "src/frames/"),
      types: path.join(__dirname, "src/types/"),
      templates: path.join(__dirname, "src/templates/"),
      utils: path.join(__dirname, "src/utils/"),
      signer: path.join(__dirname, "src/signer"),
      window: path.join(__dirname, "src/window"),
      modal: path.join(__dirname, "src/modal/"),
      "3rdParty": path.join(__dirname, "src/3rdParty/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "src"),
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          },
        },
      },
      {
        test: /\.html$/,
        include: path.resolve(__dirname, "src/templates"),
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
