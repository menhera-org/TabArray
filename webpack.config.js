// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

const path = require('path');

module.exports = {
  mode: 'production',
  context: __dirname,
  entry: {
    'background': './src/background.js',
    'index': {
      import: './src/index/index.js',
      filename: 'index/index.js',
    },
    'navigation': {
      import: './src/navigation/confirm.js',
      filename: 'navigation/confirm.js',
    },
    'popup': {
      import: './src/popup/popup.js',
      filename: 'popup/popup.js',
    },
    'options': {
      import: './src/options/options.js',
      filename: 'options/options.js',
    },
    'panorama': {
      import: './src/panorama/panorama.js',
      filename: 'panorama/panorama.js',
    },
    'firstparty': {
      import: './src/firstparty/content.js',
      filename: 'firstparty/content.js',
    },
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
  },

  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: [
      '.ts', '.js',
    ],
  },
};
