// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { CookieStore } from 'weeg-containers';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TabQueryService } from '../../lib/tabs/TabQueryService';

import { config } from '../../config/config';
import { WindowUserContextVisibilityHelper } from './WindowUserContextVisibilityHelper';
import { IndexTab } from '../modules/IndexTab';
import { UserContext } from '../tabGroups';
import { Tab } from '../tabs';
import { WindowService } from '../tabs/WindowService';

// 'never' -- do not show indices
// 'collapsed' -- show indices for collapsed containers
// 'always' -- always show indices
let configGroupIndexOption = 'never';
config['tab.groups.indexOption'].observe((value) => {
  configGroupIndexOption = value;
});

/**
 * This does not support private windows.
 */
export class UserContextVisibilityService {
  private static readonly INSTANCE = new UserContextVisibilityService();

  public static getInstance(): UserContextVisibilityService {
    return UserContextVisibilityService.INSTANCE;
  }

  private readonly _windowService = WindowService.getInstance();
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _displayedContainerService = DisplayedContainerService.getInstance();
  private readonly _tabQueryService = TabQueryService.getInstance();

  private constructor() {
    // nothing.
  }

  /**
   * You should not create index tabs for private windows (useless).
   */
  public async createIndexTab(windowId: number, userContextId: Uint32.Uint32): Promise<Tab> {
    const cookieStore = CookieStore.fromParams({
      userContextId,
      privateBrowsingId: 0 as Uint32.Uint32,
    });
    const displayedContainer = await this._displayedContainerService.getDisplayedContainer(cookieStore.id);
    const url = IndexTab.getUrl(displayedContainer.name, '', displayedContainer.colorCode, displayedContainer.iconUrl).url;
    const cookieStoreId = cookieStore.id;
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
    const tab = new Tab(browserTab);
    await browser.sessions.setTabValue(tab.id, 'indexTabUrl', url);
    await browser.sessions.setTabValue(tab.id, 'indexTabUserContextId', userContextId);
    return tab;
  }

  public async isIndexTab(tabId: number): Promise<boolean> {
    const userContextId = await browser.sessions.getTabValue(tabId, 'indexTabUserContextId');
    return null != userContextId;
  }

  public async unregisterIndexTab(tabId: number): Promise<void> {
    await browser.sessions.removeTabValue(tabId, 'indexTabUrl');
    await browser.sessions.removeTabValue(tabId, 'indexTabUserContextId');
  }

  private async getContainerTabsOnWindow(windowId: number, userContextId: Uint32.Uint32): Promise<Tab[]> {
    const browserWindow = await browser.windows.get(windowId, { populate: false });
    if (browserWindow.incognito) {
      throw new Error('Private windows are not supported here.');
    }
    const cookieStoreId = UserContext.toCookieStoreId(userContextId);
    const brwoserTabs = await browser.tabs.query({ windowId, cookieStoreId });
    const tabs = brwoserTabs.map((browserTab) => new Tab(browserTab));
    return tabs;
  }

  public async hideContainerOnWindow(windowId: number, userContextId: Uint32.Uint32): Promise<void> {
    const isPrivate = await this._windowService.isPrivateWindow(windowId);
    if (isPrivate) return;
    console.log('hideContainerOnWindow(): windowId=%d, userContextId=%d', windowId, userContextId);
    const helper = await WindowUserContextVisibilityHelper.create(windowId, userContextId); // throws for private windows.
    if (helper.tabsToHide.length < 1) {
      console.log('No tabs to hide on window %d for userContext %d', windowId, userContextId);
      return;
    }
    if ('collapsed' == configGroupIndexOption && !helper.hasIndexTab) {
      await this.createIndexTab(windowId, userContextId);
    }
    if (helper.active) {
      const tabToActivate = helper.tabToActivate;
      if (!tabToActivate) {
        // TODO: create a new tab if there is no one to activate.
        console.log('No tab to activate on window %d for userContext %d', windowId, userContextId);
        return;
      }
      await tabToActivate.focus();
    }
    await browser.tabs.hide(helper.tabsToHide.map((tab) => tab.id));
  }

  public async showContainerOnWindow(windowId: number, userContextId: Uint32.Uint32): Promise<void> {
    const isPrivate = await this._windowService.isPrivateWindow(windowId);
    if (isPrivate) return;
    const tabs = await this.getContainerTabsOnWindow(windowId, userContextId); // throws for private windows.
    if (tabs.length < 1) {
      console.log('No tabs to show on window %d for userContext %d', windowId, userContextId);
      return;
    }
    const tabIdsToShow: number[] = [];
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        if ('collapsed' == configGroupIndexOption) {
          console.log('Unregistering an index tab on window %d for userContext %d', windowId, userContextId);
          await this.unregisterIndexTab(tab.id);
          await tab.close();
        }
        continue;
      }
      if (tab.hidden) {
        tabIdsToShow.push(tab.id);
      }
    }
    if (tabIdsToShow.length < 1) {
      return;
    }
    console.log('showContainerOnWindow(): windowId=%d, userContextId=%d', windowId, userContextId);
    await browser.tabs.show(tabIdsToShow);
  }

  public async showAllOnWindow(windowId: number): Promise<void> {
    console.log('showAllOnWindow(): windowId=%d', windowId);
    const browserTabs = await browser.tabs.query({ windowId, hidden: true });
    const tabs = browserTabs.map((browserTab) => new Tab(browserTab));
    if (tabs.length < 1) {
      return;
    }
    await browser.tabs.show(tabs.map((tab) => tab.id));
  }
}
