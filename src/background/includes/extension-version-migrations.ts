/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

import browser from 'webextension-polyfill';

import { ExtensionVersionMigrationRegistry } from '../../lib/ExtensionVersionMigrationRegistry';

/**
 * Codes to run on first installation.
 */
export const MIGRATIONS = new ExtensionVersionMigrationRegistry();

// 12.0.0 removed tags: forget the tag list and the tag stored with each tab.
MIGRATIONS.defineMigration('12.0.0', async () => {
  await browser.storage.local.remove('tagDirectory');
  const browserTabs = await browser.tabs.query({});
  await Promise.all(
    browserTabs.map((browserTab) =>
      browserTab.id == null
        ? undefined
        : browser.sessions.removeTabValue(browserTab.id, 'weeg.tabAttributes').catch(() => {
            // tabs that never had a tag
          })
    )
  );
});
