const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/index.ts',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: [nodeExternals()],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist'),
  },
};
