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
import { BackgroundService, ExtensionService } from 'weeg-utils';
import { CompatTab } from 'weeg-tabs';

import { TagService } from './tags/TagService';
import { ActiveContainerService } from '../states/ActiveContainerService';
import { ServiceRegistry } from '../ServiceRegistry';
import { CompatConsole } from '../console/CompatConsole';
import { NativeTabGroupCoordinator } from './native/NativeTabGroupCoordinator';

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
const extensionService = ExtensionService.getInstance();

const getNativeCoordinator = (): NativeTabGroupCoordinator | undefined => {
  if (!extensionService.isBackgroundPage()) {
    return undefined;
  }
  return NativeTabGroupCoordinator.getInstance();
};

const openTabAndCloseCurrent = async (url: string, cookieStoreId: string, windowId: number, currentTabId: number, active: boolean) => {
  let targetGroupId: number | undefined;
  const coordinator = getNativeCoordinator();
  if (coordinator && await coordinator.isEnabled()) {
    try {
      const existingGroup = await coordinator.getGroupForWindow(windowId, cookieStoreId);
      targetGroupId = existingGroup?.id;
    } catch (_error) {
      // ignore
    }
  }
  const createOptions: browser.Tabs.CreateCreateProperties = {
    url,
    cookieStoreId,
    windowId,
    active: false,
  };
  if (typeof targetGroupId === 'number') {
    (createOptions as Record<string, unknown>).groupId = targetGroupId;
  }
  const browserTab = await createTabWithFallback(createOptions, windowId, cookieStoreId);
  if (!browserTab.id) return browser.tabs.TAB_ID_NONE;
  await Promise.all([
    active ? browser.tabs.update(browserTab.id, {active}) : Promise.resolve(),
    browser.tabs.remove(currentTabId),
  ]);
  if (coordinator && await coordinator.isEnabled() && browserTab.windowId != null) {
    await coordinator.ensureTabsGrouped(browserTab.windowId, cookieStoreId, [browserTab.id]);
  }
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
      let targetGroupId: number | undefined;
      const coordinator = getNativeCoordinator();
      if (coordinator && await coordinator.isEnabled()) {
        try {
          const existingGroup = await coordinator.getGroupForWindow(browserWindow.id, cookieStoreId);
          targetGroupId = existingGroup?.id;
        } catch (_error) {
          // ignore
        }
      }
      const createOptions: browser.Tabs.CreateCreateProperties = {
        cookieStoreId,
        windowId: browserWindow.id,
        active,
      };
      if (typeof targetGroupId === 'number') {
        (createOptions as Record<string, unknown>).groupId = targetGroupId;
      }
      const browserTab = await createTabWithFallback(createOptions, browserWindow.id, cookieStoreId);
      const tab = new CompatTab(browserTab);
      if (tagId) {
        await tagService.setTagIdForTab(tab, tagId);
      }
      if (active) {
        await browser.windows.update(browserWindow.id, {
          focused: true,
        });
      }
      if (coordinator && await coordinator.isEnabled() && browserTab.id != null) {
        await coordinator.ensureTabsGrouped(browserWindow.id, cookieStoreId, [browserTab.id]);
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
    const coordinator = getNativeCoordinator();
    if (coordinator && await coordinator.isEnabled() && openedBrowserTab.id != null && openedBrowserWindow.id != null) {
      await coordinator.ensureTabsGrouped(openedBrowserWindow.id, cookieStoreId, [openedBrowserTab.id]);
    }
    const openedTabId = openedBrowserTab.id ?? browser.tabs.TAB_ID_NONE;
    return openedTabId;
  } catch (e) {
    console.warn(e);
    return browser.tabs.TAB_ID_NONE;
  }
};

const createTabWithFallback = async (options: browser.Tabs.CreateCreateProperties, windowId: number, containerId: string): Promise<browser.Tabs.Tab> => {
  try {
    return await browser.tabs.create(options);
  } catch (error) {
    const coordinator = getNativeCoordinator();
    if (!coordinator || !await coordinator.isEnabled() || !coordinator.isNoGroupError(error)) {
      throw error;
    }
    await coordinator.invalidateMapping(windowId, containerId);
    const retryOptions = { ...options };
    delete (retryOptions as Record<string, unknown>).groupId;
    const tab = await browser.tabs.create(retryOptions);
    if (tab.id != null) {
      await coordinator.ensureTabsGrouped(windowId, containerId, [tab.id]);
    }
    return tab;
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
