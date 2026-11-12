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

/* "Open in Container" on bookmarks and bookmark folders (#209). Shown only while the optional
   bookmarks permission is granted; the popup asks for it when saving a container's tabs. */

import browser from 'webextension-polyfill';

import { CompatConsole } from '../lib/console/CompatConsole';
import { ContainerBookmarkService } from '../lib/bookmarks/ContainerBookmarkService';

const MENU_ID = 'bookmark-open-in-container';
const ITEM_PREFIX = `${MENU_ID}:`;
const NO_CONTAINER = 'firefox-default';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

ContainerBookmarkService.getInstance<ContainerBookmarkService>();

const rebuildMenu = async () => {
  await browser.menus.remove(MENU_ID).catch(() => undefined);
  if (!(await browser.permissions.contains({ permissions: ['bookmarks'] }))) return;
  browser.menus.create({
    id: MENU_ID,
    title: browser.i18n.getMessage('contextMenuOpenInContainer'),
    contexts: ['bookmark'],
  });
  const containers = [
    { cookieStoreId: NO_CONTAINER, name: browser.i18n.getMessage('noContainer') },
    ...(await browser.contextualIdentities.query({})),
  ];
  for (const { cookieStoreId, name } of containers) {
    browser.menus.create({ id: ITEM_PREFIX + cookieStoreId, parentId: MENU_ID, title: name, contexts: ['bookmark'] });
  }
};

// Rebuilds run one at a time, so menu items are never created twice.
let rebuilding = Promise.resolve();
const scheduleRebuild = () => {
  rebuilding = rebuilding.then(rebuildMenu).catch((e) => {
    console.error(e);
  });
};

/** A bookmark's URL, or the URLs directly inside a folder. */
const getBookmarkUrls = async (bookmarkId: string): Promise<string[]> => {
  const [node] = await browser.bookmarks.getSubTree(bookmarkId);
  if (!node) return [];
  const nodes = node.url ? [node] : (node.children ?? []);
  return nodes.flatMap((child) => (child.url && /^(?:https?|ftp):/.test(child.url) ? [child.url] : []));
};

browser.menus.onClicked.addListener((info) => {
  const menuItemId = String(info.menuItemId);
  if (!menuItemId.startsWith(ITEM_PREFIX) || !info.bookmarkId) return;
  const cookieStoreId = menuItemId.slice(ITEM_PREFIX.length);
  getBookmarkUrls(info.bookmarkId)
    .then(async (urls) => {
      for (const [i, url] of urls.entries()) {
        await browser.tabs.create({ url, cookieStoreId, active: i == 0 });
      }
    })
    .catch((e) => {
      console.error(e);
    });
});

browser.permissions.onAdded.addListener(scheduleRebuild);
browser.permissions.onRemoved.addListener(scheduleRebuild);
browser.contextualIdentities.onCreated.addListener(scheduleRebuild);
browser.contextualIdentities.onUpdated.addListener(scheduleRebuild);
browser.contextualIdentities.onRemoved.addListener(scheduleRebuild);
scheduleRebuild();
