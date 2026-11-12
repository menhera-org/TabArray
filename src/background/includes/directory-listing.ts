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

import browser from 'webextension-polyfill';

import { DirectoryListingService } from '../../lib/package/DirectoryListingService';

const directoryListingService = DirectoryListingService.getInstance();

/**
 * Firefox shows the extension's own directories as plain text, and since Firefox 152 extensions
 * cannot inject scripts into their own pages. Open the directory listing page in their place.
 */
export const openDirectoryListingPage = (browserTab: browser.Tabs.Tab) => {
  // Redirecting a tab that is still loading fires another update for the old URL, which would redirect again.
  if (browserTab.status != 'complete') return;
  if (browserTab.id == null || browserTab.url == null || !URL.canParse(browserTab.url)) return;
  const url = new URL(browserTab.url);
  if (url.origin != location.origin || !url.pathname.endsWith('/')) return;
  browser.tabs
    .update(browserTab.id, {
      url: directoryListingService.getListingPageUrl(directoryListingService.decodePath(url.pathname)),
      loadReplace: true,
    })
    .catch((e) => {
      console.error(e);
    });
};
