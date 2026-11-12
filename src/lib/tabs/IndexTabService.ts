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
import { CompatTab } from 'weeg-tabs';
import { CookieStore } from 'weeg-containers';
import { StorageItem } from 'weeg-storage';
import { Uint32 } from 'weeg-types';

import { DisplayedContainerService } from '../tabGroups/DisplayedContainerService';
import { TabQueryService } from './TabQueryService';
import { ServiceRegistry } from '../ServiceRegistry';

import { IndexTab } from './IndexTab';

type StorageType = {
  [tabId: number]: Uint32; // userContextId
};

const indexTabStorage = new StorageItem<StorageType>('indexTabStorage', {}, StorageItem.AREA_LOCAL);

export class IndexTabService {
  private static readonly INSTANCE = new IndexTabService();

  public static getInstance(): IndexTabService {
    return IndexTabService.INSTANCE;
  }

  private readonly _displayedContainerService = DisplayedContainerService.getInstance();
  private readonly _tabQueryService = TabQueryService.getInstance();

  private constructor() {
    // nothing.
  }

  public async getIndexTabUserContextId(tabId: number): Promise<Uint32 | undefined> {
    const value = await indexTabStorage.getValue();
    return value[tabId];
  }

  // One write at a time: concurrent read-modify-writes of the registry lost entries,
  // and an index tab missing from it got a duplicate.
  private _storageUpdates: Promise<void> = Promise.resolve();
  private updateStorage(update: (value: StorageType) => void): Promise<void> {
    const next = this._storageUpdates.then(async () => {
      const value = await indexTabStorage.getValue();
      update(value);
      await indexTabStorage.setValue(value);
    });
    this._storageUpdates = next.catch(() => undefined);
    return next;
  }

  public async setIndexTabUserContextId(tabId: number, userContextId: Uint32) {
    await this.updateStorage((value) => {
      value[tabId] = userContextId;
    });
  }

  public async removeIndexTabUserContextId(tabId: number) {
    await this.updateStorage((value) => {
      delete value[tabId];
    });
  }

  public async getIndexTabIds(): Promise<number[]> {
    const value = await indexTabStorage.getValue();
    return Object.keys(value).map((key) => parseInt(key, 10));
  }

  public async resetIndexTabStorage() {
    await this.updateStorage((value) => {
      for (const tabId of Object.keys(value)) delete value[Number(tabId)];
    });
  }

  // Index tabs being created, by window and container. A new index tab fires tab events before
  // it is registered, and those events used to create another one.
  private readonly _creating = new Map<string, Promise<CompatTab | undefined>>();

  /**
   * Creates the container's index tab in the window, unless it has one or one is being created.
   * Returns the new index tab, if one was created.
   */
  public async ensureIndexTab(windowId: number, cookieStoreId: string): Promise<CompatTab | undefined> {
    const key = `${windowId}:${cookieStoreId}`;
    const pending = this._creating.get(key);
    if (pending) {
      await pending;
      return undefined;
    }
    const creation = (async () => {
      const [browserTabs, registered] = await Promise.all([
        browser.tabs.query({ windowId, cookieStoreId }),
        indexTabStorage.getValue(),
      ]);
      const hasIndexTab = browserTabs.some(
        (browserTab) =>
          (browserTab.id != null && registered[browserTab.id] !== undefined) ||
          IndexTab.isIndexTabUrl(browserTab.url ?? '')
      );
      return hasIndexTab ? undefined : await this.createIndexTab(windowId, cookieStoreId);
    })();
    this._creating.set(key, creation);
    try {
      return await creation;
    } finally {
      this._creating.delete(key);
    }
  }

  /**
   * You should not create index tabs for private windows (useless).
   */
  private async createIndexTab(windowId: number, cookieStoreId: string): Promise<CompatTab> {
    const userContextId = new CookieStore(cookieStoreId).userContextId;
    const displayedContainer = await this._displayedContainerService.getDisplayedContainer(cookieStoreId);
    const url = IndexTab.getUrl(
      displayedContainer.name,
      '',
      displayedContainer.colorCode,
      displayedContainer.iconUrl
    ).url;
    const tabs = await this._tabQueryService.queryTabs({
      windowId,
      tabGroupId: cookieStoreId,
    });
    const minIndex = tabs.reduce((min, tab) => Math.min(min, tab.index), Number.MAX_SAFE_INTEGER);
    const browserTab = await browser.tabs.create({
      url,
      cookieStoreId,
      windowId,
      active: false,
      index: minIndex,
    });
    const tab = new CompatTab(browserTab);
    await browser.sessions.setTabValue(tab.id, 'indexTabUrl', url);
    await browser.sessions.setTabValue(tab.id, 'indexTabUserContextId', userContextId);
    await this.setIndexTabUserContextId(tab.id, userContextId);
    return tab;
  }

  public async unregisterIndexTab(tabId: number): Promise<void> {
    await this.removeIndexTabUserContextId(tabId);
    await browser.sessions.removeTabValue(tabId, 'indexTabUrl');
    await browser.sessions.removeTabValue(tabId, 'indexTabUserContextId');
  }

  public filterOutIndexTabs(tabs: CompatTab[]): CompatTab[] {
    return tabs.filter((tab) => !IndexTab.isIndexTabUrl(tab.url));
  }
}

ServiceRegistry.getInstance().registerService('IndexTabService', IndexTabService.getInstance());
