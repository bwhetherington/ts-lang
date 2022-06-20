const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/main.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      // {
      //   test: /\.rsc?$/,
      //   use: 'raw-loader',
      //   exclude: /node_modules/,
      // },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".rsc"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public"),
  },
};
