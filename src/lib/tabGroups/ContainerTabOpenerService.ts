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
import { CookieStore } from 'weeg-containers';
import { BackgroundService } from 'weeg-utils';

import { ServiceRegistry } from '../ServiceRegistry';

type TabOpenActionType = {
  tabId?: number;
  cookieStoreId: string;
  active: boolean;
};

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

const reopenTabInContainer = async (tabId: number, cookieStoreId: string, active: boolean) => {
  try {
    console.debug('reopen_tab_in_container: tabId=%d, cookieStoreId=%s', tabId, cookieStoreId);
    const browserTab = await browser.tabs.get(tabId);
    if (!browserTab.url || browserTab.url === 'about:blank' || !browserTab.cookieStoreId || !browserTab.windowId) {
      console.debug('reopen_tab_in_container: tabId=%d is incomplete, ignoring', tabId);
      return browser.tabs.TAB_ID_NONE;
    }
    const currentCookieStore = new CookieStore(browserTab.cookieStoreId);
    const targetCookieStore = new CookieStore(cookieStoreId);
    if (currentCookieStore.id === targetCookieStore.id) return browserTab.id ?? browser.tabs.TAB_ID_NONE;
    if (currentCookieStore.isPrivate != targetCookieStore.isPrivate) {
      const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => targetCookieStore.isPrivate == browserWindow.incognito);
      for (const browserWindow of browserWindows) {
        if (browserWindow.id == null) continue;
        const openedTabId = await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserWindow.id, tabId, active);
        return openedTabId;
      }
      const openedBrowserWindow = await browser.windows.create({
        url: browserTab.url,
        cookieStoreId: targetCookieStore.id,
        incognito: targetCookieStore.isPrivate,
        focused: active,
      });
      const openedBrowserTabs = await browser.tabs.query({windowId: openedBrowserWindow.id});
      if (openedBrowserTabs.length === 0) {
        return browser.tabs.TAB_ID_NONE;
      }
      const openedTabId = openedBrowserTabs[openedBrowserTabs.length - 1]?.id ?? browser.tabs.TAB_ID_NONE;
      await browser.tabs.remove(tabId);
      return openedTabId;
    } else {
      const openedTabId = await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserTab.windowId, tabId, active);
      return openedTabId;
    }
  } catch (e) {
    // this happens when the tab is privileged
    console.warn(e);
    return browser.tabs.TAB_ID_NONE;
  }
};

const openNewTabInContainer = async (cookieStoreId: string, active: boolean) => {
  try {
    console.debug('open_new_tab_in_container: cookieStoreId=%s', cookieStoreId);
    const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => new CookieStore(cookieStoreId).isPrivate == browserWindow.incognito);
    for (const browserWindow of browserWindows) {
      if (browserWindow.id == null) continue;
      const browserTab = await browser.tabs.create({
        cookieStoreId,
        windowId: browserWindow.id,
        active,
      });
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
    const openedBrowserTabs = await browser.tabs.query({windowId: openedBrowserWindow.id});
    if (openedBrowserTabs.length === 0) {
      return browser.tabs.TAB_ID_NONE;
    }
    const openedTabId = openedBrowserTabs[openedBrowserTabs.length - 1]?.id ?? browser.tabs.TAB_ID_NONE;
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
      return openNewTabInContainer(input.cookieStoreId, input.active);
    }
    return reopenTabInContainer(input.tabId, input.cookieStoreId, input.active);
  }

  public async reopenTabInContainer(tabId: number, cookieStoreId: string, active: boolean): Promise<number> {
    return this.call({tabId, cookieStoreId, active});
  }

  public async openNewTabInContainer(cookieStoreId: string, active: boolean): Promise<number> {
    return this.call({cookieStoreId, active});
  }
}

ServiceRegistry.getInstance().registerService('ContainerTabOpenerService', ContainerTabOpenerService.getInstance<ContainerTabOpenerService>());
