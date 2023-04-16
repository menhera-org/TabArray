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
import { CompatTab } from 'weeg-tabs';
import { CookieStore } from 'weeg-containers';

import { DisplayedContainerService } from "../tabGroups/DisplayedContainerService";
import { TabQueryService } from "./TabQueryService";
import { ServiceRegistry } from '../ServiceRegistry';

import { IndexTab } from '../../legacy-lib/modules/IndexTab';

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

  /**
   * You should not create index tabs for private windows (useless).
   */
  public async createIndexTab(windowId: number, cookieStoreId: string): Promise<CompatTab> {
    const userContextId = new CookieStore(cookieStoreId).userContextId;
    const displayedContainer = await this._displayedContainerService.getDisplayedContainer(cookieStoreId);
    const url = IndexTab.getUrl(displayedContainer.name, '', displayedContainer.colorCode, displayedContainer.iconUrl).url;
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
    return tab;
  }

  public async unregisterIndexTab(tabId: number): Promise<void> {
    await browser.sessions.removeTabValue(tabId, 'indexTabUrl');
    await browser.sessions.removeTabValue(tabId, 'indexTabUserContextId');
  }
}

ServiceRegistry.getInstance().registerService('IndexTabService', IndexTabService.getInstance());
