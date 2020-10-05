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
});
