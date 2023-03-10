// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env es2020, node */

const path = require('path');

module.exports = {
  mode: 'production',
  context: __dirname,
  target: ['web', 'es2021'],
  devtool: 'source-map',

  resolve: {
    extensions: ['.ts', '.d.ts', '.js'],
  },

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
    'options': {
      import: './src/options/options.ts',
      filename: 'options/options.js',
    },
    'panorama': {
      import: './src/panorama/panorama.ts',
      filename: 'panorama/panorama.js',
    },
    'cookies': {
      import: './src/cookies/cookies.ts',
      filename: 'cookies/cookies.js',
    },
    'languages': {
      import: './src/content/content.ts',
      filename: 'content/content.js',
    },
    'page-action': {
      import: './src/page-action/page-action.ts',
      filename: 'page-action/page-action.js',
    },
    'popup-v2': {
      import: './src/popup-v2/popup-v2.ts',
      filename: 'popup-v2/popup-v2.js',
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
};
