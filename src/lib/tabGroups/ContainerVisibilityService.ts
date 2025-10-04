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

import { IndexTabService } from '../tabs/IndexTabService';
import { ServiceRegistry } from '../ServiceRegistry';
import { CompatConsole } from '../console/CompatConsole';
import { PerformanceHistoryService } from '../history/PerformanceHistoryService';

import { config } from '../../config/config';
import { WindowContainerHidingHelper } from './WindowContainerHidingHelper';
import { IndexTab } from '../../legacy-lib/modules/IndexTab';
import { WindowService } from '../../legacy-lib/tabs/WindowService';
import { TabQueryService } from '../tabs/TabQueryService';
import { NativeTabGroupCoordinator } from './native/NativeTabGroupCoordinator';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/**
 * This does not support private windows.
 */
export class ContainerVisibilityService {
  private static readonly INSTANCE = new ContainerVisibilityService();

  public static getInstance(): ContainerVisibilityService {
    return ContainerVisibilityService.INSTANCE;
  }

  private readonly _windowService = WindowService.getInstance();
  private readonly _indexTabService = IndexTabService.getInstance();
  private readonly _performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();
  private readonly _tabQueryService = TabQueryService.getInstance();
  private getNativeCoordinator(): NativeTabGroupCoordinator | undefined {
    return NativeTabGroupCoordinator.tryGetInstance();
  }

  private constructor() {
    // nothing.
  }

  /**
   * Private windows are not supported.
   */
  private async getContainerTabsOnWindow(windowId: number, cookieStoreId: string): Promise<CompatTab[]> {
    const browserTabs = await browser.tabs.query({ windowId, cookieStoreId });
    const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
    return tabs;
  }

  /**
   * Focus to the last accessed tab in the container.
   * @param windowId
   * @param cookieStoreId
   * @returns
   */
  public async focusContainerOnWindow(windowId: number, cookieStoreId: string): Promise<void> {
    const cookieStore = new CookieStore(cookieStoreId);
    const {isPrivate, userContextId} = cookieStore;
    if (isPrivate) {
      console.assert(userContextId === 0, 'Private windows should only have userContextId 0');
    }
    const tabs = await this._tabQueryService.queryTabs({
      tabGroupId: cookieStoreId,
      windowId,
    });
    if (tabs.length === 0) {
      return;
    }
    const lastAccessedTab = tabs.reduce((a, b) => {
      if (a.pinned && !b.pinned) {
        return b;
      } else if (!a.pinned && b.pinned) {
        return a;
      }
      return a.lastAccessed > b.lastAccessed ? a : b;
    });
    lastAccessedTab.focus();
  }

  public async hideContainerOnWindow(windowId: number, cookieStoreId: string): Promise<boolean> {
    const startTime = Date.now();
    const isPrivate = await this._windowService.isPrivateWindow(windowId);
    if (isPrivate) return false;
    const configGroupIndexOption = await config['tab.groups.indexOption'].getValue();
    console.log('hideContainerOnWindow(): windowId=%d, cookieStoreId=%s', windowId, cookieStoreId);
    const helper = await WindowContainerHidingHelper.create(windowId, cookieStoreId); // throws for private windows.
    if (helper.tabsToHide.length < 1) {
      console.log('No tabs to hide on window %d for cookie store %s', windowId, cookieStoreId);
      return false;
    }
    const nativeCoordinator = this.getNativeCoordinator();
    if (nativeCoordinator && await nativeCoordinator.isEnabled()) {
      const tabIds = helper.tabsToHide.map((tab) => tab.id);
      await nativeCoordinator.ensureTabsGrouped(windowId, cookieStoreId, tabIds);
      if (helper.active) {
        const tabToActivate = helper.tabToActivate;
        if (tabToActivate) {
          await tabToActivate.focus();
        }
      }
      await nativeCoordinator.setCollapsed(windowId, cookieStoreId, true);
      const duration = Date.now() - startTime;
      this._performanceHistoryService.addEntry('ContainerVisibilityService.hideContainerOnWindow', startTime, duration);
      return true;
    }
    if ('collapsed' == configGroupIndexOption && !helper.hasIndexTab) {
      await this._indexTabService.createIndexTab(windowId, cookieStoreId);
    }
    if (helper.active) {
      const tabToActivate = helper.tabToActivate;
      if (!tabToActivate) {
        // TODO: create a new tab if there is no one to activate.
        console.log('No tab to activate on window %d for cookie store %s', windowId, cookieStoreId);
        return false;
      }
      await tabToActivate.focus();
    }
    await browser.tabs.hide(helper.tabsToHide.map((tab) => tab.id));
    const duration = Date.now() - startTime;
    this._performanceHistoryService.addEntry('ContainerVisibilityService.hideContainerOnWindow', startTime, duration);
    return true;
  }

  public async showContainerOnWindow(windowId: number, cookieStoreId: string): Promise<void> {
    const startTime = Date.now();
    const isPrivate = await this._windowService.isPrivateWindow(windowId);
    if (isPrivate) return;
    const configGroupIndexOption = await config['tab.groups.indexOption'].getValue();
    const tabs = await this.getContainerTabsOnWindow(windowId, cookieStoreId); // throws for private windows.
    if (tabs.length < 1) {
      console.log('No tabs to show on window %d for cookie store %s', windowId, cookieStoreId);
      return;
    }
    const nativeCoordinator = this.getNativeCoordinator();
    if (nativeCoordinator && await nativeCoordinator.isEnabled()) {
      await nativeCoordinator.ensureTabsGrouped(windowId, cookieStoreId, tabs.map((tab) => tab.id));
      await nativeCoordinator.setCollapsed(windowId, cookieStoreId, false);
      const duration = Date.now() - startTime;
      this._performanceHistoryService.addEntry('ContainerVisibilityService.showContainerOnWindow', startTime, duration);
      return;
    }
    const tabIdsToShow: number[] = [];
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        if ('collapsed' == configGroupIndexOption) {
          console.log('Unregistering an index tab on window %d for cookie store %s', windowId, cookieStoreId);
          await this._indexTabService.unregisterIndexTab(tab.id);
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
    console.log('showContainerOnWindow(): windowId=%d, cookieStoreId=%s', windowId, cookieStoreId);
    await browser.tabs.show(tabIdsToShow);
    const duration = Date.now() - startTime;
    this._performanceHistoryService.addEntry('ContainerVisibilityService.showContainerOnWindow', startTime, duration);
  }

  public async showAllOnWindow(windowId: number): Promise<void> {
    const startTime = Date.now();
    console.log('showAllOnWindow(): windowId=%d', windowId);
    const browserTabs = await browser.tabs.query({ windowId, hidden: true });
    const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
    if (tabs.length < 1) {
      return;
    }
    await browser.tabs.show(tabs.map((tab) => tab.id));
    const duration = Date.now() - startTime;
    this._performanceHistoryService.addEntry('ContainerVisibilityService.showAllOnWindow', startTime, duration);
  }
}

ServiceRegistry.getInstance().registerService('ContainerVisibilityService', ContainerVisibilityService.getInstance());
