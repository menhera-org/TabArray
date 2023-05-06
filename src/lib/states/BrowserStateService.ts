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

import browser from "webextension-polyfill";
import { DisplayedContainer } from 'weeg-containers';
import { ExtensionService } from "weeg-utils";
import { RegistrableDomainService } from "weeg-domains";
import { CompatTab } from "weeg-tabs";

import { BrowserStateDao } from "./BrowserStateDao";
import { WindowStateDao } from "./WindowStateDao";
import { TabDao } from "./TabDao";
import { DisplayedContainerDao } from "./DisplayedContainerDao";

import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabAttributeMap } from '../../lib/tabGroups/TabAttributeMap';
import { TabGroupDirectory } from "../tabGroups/TabGroupDirectory";
import { DisplayedContainerService } from "../tabGroups/DisplayedContainerService";
import { PerformanceHistoryService } from "../PerformanceHistoryService";
import { SpinnerService } from "../SpinnerService";

export type BrowserStateConstructParams = {
  browserWindows: browser.Windows.Window[];
  currentWindowId: number;
  displayedContainers: DisplayedContainer[];
  enabledInPrivateBrowsing: boolean;
  tabGroupDirectorySnapshot: TabGroupDirectorySnapshot;
  tabAttributeMap: TabAttributeMap;
  registrableDomainMap: Map<string, string>;
};

const tabGroupDirectory = new TabGroupDirectory();
const extensionService = ExtensionService.getInstance();
const displayedContainerService = DisplayedContainerService.getInstance();
const registrableDomainService = RegistrableDomainService.getInstance<RegistrableDomainService>();
const performanceHistoryService = PerformanceHistoryService.getInstance<PerformanceHistoryService>();
const spinnerService = SpinnerService.getInstance();

export class BrowserStateService {
  private static readonly INSTANCE = new BrowserStateService();

  public static getInstance(): BrowserStateService {
    return BrowserStateService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public async getConstructParams(): Promise<BrowserStateConstructParams> {
    const startTime = Date.now();
    spinnerService.beginTransaction('browser-state-get');
    try {
      const [browserWindows, currentBrowserWindow, displayedContainers, enabledInPrivateBrowsing, tabGroupDirectorySnapshot] = await Promise.all([
        browser.windows.getAll({
          populate: true,
          windowTypes: ['normal'],
        }),
        browser.windows.get(browser.windows.WINDOW_ID_CURRENT, { populate: false }),
        displayedContainerService.getDisplayedContainers(),
        extensionService.isAllowedInPrivateBrowsing(),
        tabGroupDirectory.getSnapshot(),
      ]);
      if (null == currentBrowserWindow.id) {
        throw new Error('currentBrowserWindow.id is null');
      }
      const registrableDomainMap = new Map<string, string>();
      const urls: string[] = [];
      const compatTabMap = new Map<number, CompatTab>();
      for (const browserWindow of browserWindows) {
        if (browserWindow.tabs == null) continue;
        for (const browserTab of browserWindow.tabs) {
          if (browserTab.id == null) continue;
          compatTabMap.set(browserTab.id, new CompatTab(browserTab));
          if (browserTab.url) {
            const url = browserTab.url;
            if (!urls.includes(url)) {
              urls.push(url);
            }
          }
        }
      }
      const registrableDomains = await registrableDomainService.getRegistrableDomains(urls);
      if (registrableDomains.length !== urls.length) {
        throw new Error('registrableDomains.length !== urls.length');
      }
      for (let i = 0; i < urls.length; i++) {
        registrableDomainMap.set(urls[i] as string, registrableDomains[i] as string);
      }

      const tabAttributeMap = await TabAttributeMap.create(compatTabMap.values());
      const duration = Date.now() - startTime;
      performanceHistoryService.addEntry('BrowserStateService.getConstructParams', startTime, duration);

      const constructParams = {
        browserWindows,
        currentWindowId: currentBrowserWindow.id,
        displayedContainers,
        enabledInPrivateBrowsing,
        tabGroupDirectorySnapshot,
        tabAttributeMap,
        registrableDomainMap,
      };
      return constructParams;
    } finally {
      spinnerService.endTransaction('browser-state-get');
    }
  }

  public getBrowserState(params: BrowserStateConstructParams): BrowserStateDao {
    const displayedContainers = [... params.displayedContainers];
    params.tabGroupDirectorySnapshot.sortDisplayedContainers(displayedContainers);
    const value: BrowserStateDao = {
      currentWindowId: browser.windows.WINDOW_ID_NONE,
      enabledInPrivateBrowsing: false,
      windowIds: [],
      displayedContainers: [],
      tags: {},
      tagIdsForTabs: {},
      supergroups: {},
      tabIdsByContainer: {},
      tabIdsBySite: {},
      tabs: {},
      windows: {},
    };

    value.supergroups = params.tabGroupDirectorySnapshot.value;

    for (const displayedContainer of displayedContainers) {
      const dao = DisplayedContainerDao.fromDisplayedContainer(displayedContainer);
      value.displayedContainers.push(dao);
    }

    for (const tag of params.tabAttributeMap.getTags()) {
      value.tags[tag.tagId] = tag;
    }

    value.currentWindowId = params.currentWindowId;
    value.enabledInPrivateBrowsing = params.enabledInPrivateBrowsing;

    for (const browserWindow of params.browserWindows) {
      if (browserWindow.tabs == null || browserWindow.id == null) {
        throw new Error('Invalid browserWindow');
      }
      value.windowIds.push(browserWindow.id);
      const windowState: WindowStateDao = {
        id: browserWindow.id,
        isPrivate: browserWindow.incognito,
        tabs: {},
        activeTabIds: [],
        pinnedTabIds: [],
        activeContainers: [],
        unpinnedTabIdsByContainer: {},
      };
      value.windows[browserWindow.id] = windowState;
      for (const browserTab of browserWindow.tabs) {
        const tab = new CompatTab(browserTab);
        const tabDao = TabDao.fromCompatTab(tab);
        value.tabs[tab.id] = tabDao;
        windowState.tabs[tab.id] = tabDao;
        const cookieStoreId = tabDao.cookieStoreId;
        if (tab.active) {
          windowState.activeTabIds.push(tab.id);
          if (!windowState.activeContainers.includes(cookieStoreId)) {
            windowState.activeContainers.push(cookieStoreId);
          }
        }
        if (tab.pinned) {
          windowState.pinnedTabIds.push(tab.id);
        } else {
          const unpinnedTabIds = windowState.unpinnedTabIdsByContainer[cookieStoreId] || [];
          unpinnedTabIds.push(tab.id);
          windowState.unpinnedTabIdsByContainer[cookieStoreId] = unpinnedTabIds;
        }
        const tagId = params.tabAttributeMap.getTagIdForTab(tab.id);
        if (tagId != 0 && tagId != null) {
          value.tagIdsForTabs[tab.id] = tagId;
        }
        {
          const tabIds = value.tabIdsByContainer[cookieStoreId] || [];
          tabIds.push(tab.id);
          value.tabIdsByContainer[cookieStoreId] = tabIds;
        }
        {
          const registrableDomain = params.registrableDomainMap.get(tab.url);
          if (registrableDomain != null) {
            const tabIds = value.tabIdsBySite[registrableDomain] || [];
            tabIds.push(tab.id);
            value.tabIdsBySite[registrableDomain] = tabIds;
          }
        }
      }
    }
    return this.sortValuesInBrowserState(value);
  }

  public sortTabIds(tabIds: number[], tabs: { [tabId: number]: TabDao }): number[] {
    tabIds = [... tabIds];
    tabIds.sort((a, b) => {
      const tabA = tabs[a] as TabDao;
      const tabB = tabs[b] as TabDao;
      if (tabA.windowId != tabB.windowId) {
        return tabA.windowId - tabB.windowId;
      }
      return tabA.index - tabB.index;
    });
    return tabIds;
  }

  public sortValuesInBrowserState(browserState: BrowserStateDao): BrowserStateDao {
    browserState.windowIds.sort();
    for (const windowId in browserState.windows) {
      const windowState = browserState.windows[windowId] as WindowStateDao;
      windowState.activeTabIds = this.sortTabIds(windowState.activeTabIds, windowState.tabs);
      windowState.pinnedTabIds = this.sortTabIds(windowState.pinnedTabIds, windowState.tabs);
      for (const cookieStoreId in {... windowState.unpinnedTabIdsByContainer}) {
        const unpinnedTabs = windowState.unpinnedTabIdsByContainer[cookieStoreId] as number[];
        windowState.unpinnedTabIdsByContainer[cookieStoreId] = this.sortTabIds(unpinnedTabs, windowState.tabs);
      }
    }
    return browserState;
  }
}
