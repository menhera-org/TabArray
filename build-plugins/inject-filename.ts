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
import { fileURLToPath } from 'node:url';
import { RolldownMagicString, type Plugin } from 'rolldown';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Replaces `__filename` in our own modules with the module path relative to
 * the project root (as Parcel did). Used by `CompatConsole.tagFromFilename()`.
 */
export const injectFilename = (): Plugin => ({
  name: 'ctg:inject-filename',
  transform: {
    filter: {
      id: { include: /\.[cm]?[jt]sx?$/, exclude: /\/node_modules\// },
      code: '__filename',
    },
    handler(code, id) {
      const relativePath = path.relative(ROOT_DIR, id).split(path.sep).join('/');
      const s = new RolldownMagicString(code);
      for (const match of code.matchAll(/\b__filename\b/g)) {
        s.overwrite(match.index, match.index + match[0].length, JSON.stringify(relativePath));
      }
      return { code: s };
    },
  },
});
