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

import { defineConfig } from 'rolldown';

import { injectFilename } from './build-plugins/inject-filename.ts';
import { BUILD_TARGET } from './build-plugins/target.ts';

// Content scripts are injected as classic scripts, so each one is bundled
// into a single self-contained IIFE at a fixed path (see manifest.json and
// CONTENT_EXTENSION_DIRECTORY_LISTING in src/defs.ts).
const CONTENT_SCRIPTS = ['content/overrides/content', 'content/ext/directory-listing/directory-listing'];

export default defineConfig(
  CONTENT_SCRIPTS.map((name) => ({
    input: `src/${name}.ts`,
    platform: 'browser',
    tsconfig: 'tsconfig.json',
    plugins: [injectFilename()],
    transform: {
      target: BUILD_TARGET,
    },
    output: {
      file: `dist/${name}.js`,
      format: 'iife',
      sourcemap: true,
      minify: true,
    },
  }))
);
