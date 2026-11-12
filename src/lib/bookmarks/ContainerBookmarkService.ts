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
import { BackgroundService } from 'weeg-utils';

import { ServiceRegistry } from '../ServiceRegistry';

type SaveRequest = { cookieStoreId: string; name: string };

const BOOKMARKS_PERMISSION = { permissions: ['bookmarks'] as browser.Manifest.OptionalPermission[] };

const hasBookmarksPermission = () => browser.permissions.contains(BOOKMARKS_PERMISSION);

/** The container's tabs, as bookmarks in a new folder named after the container (#209). */
const saveTabsAsBookmarks = async ({ cookieStoreId, name }: SaveRequest) => {
  const browserTabs = await browser.tabs.query({ cookieStoreId });
  const pages = browserTabs
    .filter((browserTab) => /^(?:https?|file):/.test(browserTab.url ?? ''))
    .sort((a, b) => (a.windowId ?? 0) - (b.windowId ?? 0) || a.index - b.index);
  if (pages.length == 0) return;
  const folder = await browser.bookmarks.create({ title: name });
  for (const page of pages) {
    await browser.bookmarks.create({ parentId: folder.id, title: page.title ?? page.url, url: page.url });
  }
};

/**
 * Saves a container's tabs as bookmarks. The bookmarks permission is optional and asked for from the
 * popup, which Firefox may close while asking, so the saving happens here, once the permission is there.
 */
export class ContainerBookmarkService extends BackgroundService<SaveRequest, void> {
  // Only the latest click waits for the permission, so a denied request is not saved later.
  private _pending: SaveRequest | null = null;

  public override getServiceName(): string {
    return 'ContainerBookmarkService';
  }

  protected override initializeBackground(): void {
    browser.permissions.onAdded.addListener((permissions) => {
      const request = this._pending;
      if (!request || !permissions.permissions?.includes('bookmarks')) return;
      this._pending = null;
      saveTabsAsBookmarks(request).catch((e) => {
        console.error(e);
      });
    });
  }

  protected override async execute(request: SaveRequest): Promise<void> {
    if (await hasBookmarksPermission()) {
      await saveTabsAsBookmarks(request);
    } else {
      this._pending = request;
    }
  }

  /** Call from a click: it also asks for the bookmarks permission when needed. */
  public saveContainerTabs(cookieStoreId: string, name: string): void {
    this.call({ cookieStoreId, name }).catch((e) => {
      console.error(e);
    });
    browser.permissions.request(BOOKMARKS_PERMISSION).catch((e) => {
      console.error(e);
    });
  }
}

ServiceRegistry.getInstance().registerService(
  'ContainerBookmarkService',
  ContainerBookmarkService.getInstance<ContainerBookmarkService>()
);
