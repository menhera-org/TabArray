/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
  @license
**/


import path from 'node:path';
import { defineConfig } from 'vite';

import { injectFilename } from './build-plugins/inject-filename.ts';
import { BUILD_TARGET } from './build-plugins/target.ts';

// Extension pages. Output paths mirror their location under src/.
const PAGES = [
  'background/background.html',
  'pages/cookies/cookies.html',
  'pages/debugging/debugging.html',
  'pages/index/index-tab.html',
  'pages/navigation/confirm.html',
  'pages/navigation/open-container.html',
  'pages/options/options.html',
  'pages/page-action/page-action.html',
  'pages/panorama/panorama.html',
  'pages/popup-v2/popup-v2.html',
];

const SRC_DIR = path.resolve(import.meta.dirname, 'src');

// Content scripts must be classic scripts, so they are built separately
// by Rolldown (see rolldown.config.ts).
export default defineConfig({
  root: SRC_DIR,
  // Copied verbatim. The minified React builds in static/react/ must stay
  // byte-identical to upstream for AMO review, so never import them.
  publicDir: path.resolve(import.meta.dirname, 'static'),
  base: '/',
  plugins: [
    { ...injectFilename(), enforce: 'pre' },
  ],
  css: {
    transformer: 'lightningcss',
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: BUILD_TARGET,
    sourcemap: true,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: PAGES.map((page) => path.resolve(SRC_DIR, page)),
    },
  },
});
