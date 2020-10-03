const loaders = { iframe: "./iframe-loader.js" };

module.exports = (name, filePath, resultPath) => ({
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
  devtool: "source-map",
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
});
