// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env es2020, node */

const path = require('path');

module.exports = {
  mode: 'production',
  context: __dirname,
  target: ['web', 'es2020'],
  devtool: 'inline-cheap-source-map',
  entry: {
    'background': './src/background.ts',
    'index': {
      import: './src/index/index-tab.ts',
      filename: 'index/index-tab.js',
    },
    'navigation': {
      import: './src/navigation/select-container.ts',
      filename: 'navigation/confirm.js',
    },
    'popup': {
      import: './src/popup/popup.ts',
      filename: 'popup/popup.js',
    },
    'options': {
      import: './src/options/options.ts',
      filename: 'options/options.js',
    },
    'panorama': {
      import: './src/panorama/panorama.ts',
      filename: 'panorama/panorama.js',
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
