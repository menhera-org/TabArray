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
import { CookieStore } from 'weeg-containers';
import { BackgroundService } from 'weeg-utils';
import { CompatTab } from 'weeg-tabs';

import { TagService } from './tags/TagService';
import { ActiveContainerService } from '../states/ActiveContainerService';
import { ServiceRegistry } from '../ServiceRegistry';
import { CompatConsole } from '../console/CompatConsole';

type TabOpenActionType = {
  tabId?: number;
  cookieStoreId: string;
  active: boolean;
  windowId?: number;
  tagId?: number;
  url?: string;
};

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const tagService = TagService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();

const openTabAndCloseCurrent = async (url: string, cookieStoreId: string, windowId: number, currentTabId: number, active: boolean) => {
  const browserTab = await browser.tabs.create({
    url,
    cookieStoreId,
    windowId,
    active: false,
  });
  if (!browserTab.id) return browser.tabs.TAB_ID_NONE;
  await Promise.all([
    active ? browser.tabs.update(browserTab.id, {active}) : Promise.resolve(),
    browser.tabs.remove(currentTabId),
  ]);
  return browserTab.id;
};

const reopenTabInContainer = async (tabId: number, cookieStoreId: string, active: boolean, url?: string) => {
  try {
    console.debug('reopen_tab_in_container: tabId=%d, cookieStoreId=%s', tabId, cookieStoreId);
    const browserTab = await browser.tabs.get(tabId);
    const oldTab = new CompatTab(browserTab);
    const oldTagId = (await tagService.getTagForTab(oldTab))?.tagId ?? 0;
    if (!browserTab.url || browserTab.url === 'about:blank' || !browserTab.cookieStoreId || !browserTab.windowId) {
      console.debug('reopen_tab_in_container: tabId=%d is incomplete, ignoring', tabId);
      return tabId;
    }
    const targetUrl = url ?? browserTab.url;
    const currentCookieStore = new CookieStore(browserTab.cookieStoreId);
    const targetCookieStore = new CookieStore(cookieStoreId);
    if (currentCookieStore.id === targetCookieStore.id) return tabId;
    if (currentCookieStore.isPrivate != targetCookieStore.isPrivate) {
      const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => targetCookieStore.isPrivate == browserWindow.incognito);
      for (const browserWindow of browserWindows) {
        if (browserWindow.id == null) continue;
        const openedTabId = await openTabAndCloseCurrent(targetUrl, targetCookieStore.id, browserWindow.id, tabId, active);
        if (oldTagId != 0) {
          const openedTab = new CompatTab(await browser.tabs.get(openedTabId));
          await tagService.setTagIdForTab(openedTab, oldTagId);
        }
        return openedTabId;
      }
      const openedBrowserWindow = await browser.windows.create({
        url: targetUrl,
        cookieStoreId: targetCookieStore.id,
        incognito: targetCookieStore.isPrivate,
        focused: active,
      });
      const openedBrowserTabs = await browser.tabs.query({windowId: openedBrowserWindow.id});
      if (openedBrowserTabs.length === 0) {
        return browser.tabs.TAB_ID_NONE;
      }
      const openedBrowserTab = openedBrowserTabs[openedBrowserTabs.length - 1];
      if (!openedBrowserTab) {
        console.warn('reopen_tab_in_container: openedBrowserTab is null');
      } else if (oldTagId != 0) {
        const openedTab = new CompatTab(openedBrowserTab);
        await tagService.setTagIdForTab(openedTab, oldTagId);
      }
      const openedTabId = openedBrowserTab?.id ?? browser.tabs.TAB_ID_NONE;
      if (openedTabId != browser.tabs.TAB_ID_NONE) {
        await browser.tabs.remove(tabId); // remove old tab
      }
      return openedTabId;
    } else {
      const openedTabId = await openTabAndCloseCurrent(targetUrl, targetCookieStore.id, browserTab.windowId, tabId, active);
      if (oldTagId != 0) {
        const openedTab = new CompatTab(await browser.tabs.get(openedTabId));
        await tagService.setTagIdForTab(openedTab, oldTagId);
      }
      return openedTabId;
    }
  } catch (e) {
    // this happens when the tab is privileged
    console.warn(e);
    return browser.tabs.TAB_ID_NONE;
  }
};

const openNewTabInContainer = async (cookieStoreId: string, active: boolean, windowId?: number, tagId?: number) => {
  try {
    console.debug('open_new_tab_in_container: cookieStoreId=%s', cookieStoreId);
    const cookieStore = new CookieStore(cookieStoreId);
    const currentBrowserWindow = windowId == null ? await browser.windows.getCurrent() : await browser.windows.get(windowId);
    const browserWindows = currentBrowserWindow.incognito == cookieStore.isPrivate
    ? [currentBrowserWindow]
    : (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => cookieStore.isPrivate == browserWindow.incognito);
    for (const browserWindow of browserWindows) {
      if (browserWindow.id == null) continue;
      activeContainerService.setActiveContainer(browserWindow.id, cookieStoreId);
      const browserTab = await browser.tabs.create({
        cookieStoreId,
        windowId: browserWindow.id,
        active,
      });
      const tab = new CompatTab(browserTab);
      if (tagId) {
        await tagService.setTagIdForTab(tab, tagId);
      }
      if (active) {
        await browser.windows.update(browserWindow.id, {
          focused: true,
        });
      }
      return browserTab.id ?? browser.tabs.TAB_ID_NONE;
    }
    const openedBrowserWindow = await browser.windows.create({
      cookieStoreId,
      incognito: new CookieStore(cookieStoreId).isPrivate,
      focused: active,
    });
    const openedBrowserTabs = await browser.tabs.query({ windowId: openedBrowserWindow.id });
    if (openedBrowserTabs.length === 0) {
      return browser.tabs.TAB_ID_NONE;
    }
    const openedBrowserTab = openedBrowserTabs[openedBrowserTabs.length - 1] as browser.Tabs.Tab;
    const openedTab = new CompatTab(openedBrowserTab);
    if (tagId) {
      await tagService.setTagIdForTab(openedTab, tagId);
    }
    const openedTabId = openedBrowserTab.id ?? browser.tabs.TAB_ID_NONE;
    return openedTabId;
  } catch (e) {
    console.warn(e);
    return browser.tabs.TAB_ID_NONE;
  }
};

export class ContainerTabOpenerService extends BackgroundService<TabOpenActionType, number> {
  public override getServiceName(): string {
    return 'ContainerTabOpenerService';
  }

  protected override initializeBackground(): void {
    // do nothing
  }

  protected override execute(input: TabOpenActionType): Promise<number> {
    if (input.tabId == null) {
      return openNewTabInContainer(input.cookieStoreId, input.active, input.windowId, input.tagId);
    }
    return reopenTabInContainer(input.tabId, input.cookieStoreId, input.active, input.url);
  }

  public async reopenTabInContainer(tabId: number, cookieStoreId: string, active: boolean, url?: string): Promise<number> {
    return this.call({ tabId, cookieStoreId, active, url });
  }

  public async openNewTabInContainer(cookieStoreId: string, active: boolean, windowId?: number, tagId?: number): Promise<number> {
    return this.call({ cookieStoreId, active, windowId, tagId });
  }
}

ServiceRegistry.getInstance().registerService('ContainerTabOpenerService', ContainerTabOpenerService.getInstance<ContainerTabOpenerService>());
