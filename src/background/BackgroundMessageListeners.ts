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
import { CookieStore, ContextualIdentity } from '../frameworks/tabAttributes';
import { MessagingService } from '../frameworks/extension/MessagingService';

const messagingService = MessagingService.getInstance();

const openTabAndCloseCurrent = async (url: string, cookieStoreId: string, windowId: number, currentTabId: number, active: boolean) => {
  const browserTab = await browser.tabs.create({
    url,
    cookieStoreId,
    windowId,
    active: false,
  });
  if (!browserTab.id) return;
  await Promise.all([
    browser.tabs.update(browserTab.id, {active}),
    browser.tabs.remove(currentTabId),
  ]);
};

const reopenTabInContainer = async (tabId: number, cookieStoreId: string, active: boolean) => {
  try {
    console.debug('reopen_tab_in_container: tabId=%d, cookieStoreId=%s', tabId, cookieStoreId);
    const browserTab = await browser.tabs.get(tabId);
    if (!browserTab.url || browserTab.url === 'about:blank' || !browserTab.cookieStoreId || !browserTab.windowId) {
      console.debug('reopen_tab_in_container: tabId=%d is incomplete, ignoring', tabId);
      return;
    }
    const currentCookieStore = CookieStore.fromId(browserTab.cookieStoreId);
    const targetCookieStore = CookieStore.fromId(cookieStoreId);
    if (currentCookieStore.id === targetCookieStore.id) return;
    if (currentCookieStore.isPrivate != targetCookieStore.isPrivate) {
      const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => targetCookieStore.isPrivate == browserWindow.incognito);
      for (const browserWindow of browserWindows) {
        if (browserWindow.id == null) continue;
        await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserWindow.id, tabId, active);
        return;
      }
      await browser.windows.create({
        url: browserTab.url,
        cookieStoreId: targetCookieStore.id,
        incognito: targetCookieStore.isPrivate,
        focused: active,
      });
      await browser.tabs.remove(tabId);
    } else {
      await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserTab.windowId, tabId, active);
    }
  } catch (e) {
    // this happens when the tab is privileged
    console.warn(e);
  }
};

const openNewTabInContainer = async (cookieStoreId: string, active: boolean) => {
  try {
    console.debug('open_new_tab_in_container: cookieStoreId=%s', cookieStoreId);
    const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => CookieStore.fromId(cookieStoreId).isPrivate == browserWindow.incognito);
    for (const browserWindow of browserWindows) {
      if (browserWindow.id == null) continue;
      await browser.tabs.create({
        cookieStoreId,
        windowId: browserWindow.id,
        active,
      });
      if (active) {
        await browser.windows.update(browserWindow.id, {
          focused: true,
        });
      }
      return;
    }
    await browser.windows.create({
      cookieStoreId,
      incognito: CookieStore.fromId(cookieStoreId).isPrivate,
      focused: active,
    });
  } catch (e) {
    console.warn(e);
  }
};

const containerCreate = async (name: string, color: string, icon: string): Promise<string> => {
  console.debug('container_create: name=%s, color=%s, icon=%s', name, color, icon);
  const contextualIdentity = await ContextualIdentity.create({name, color, icon});
  return contextualIdentity.id;
};

const containerUpdate = async (name: string, color: string, icon: string, cookieStoreId: string): Promise<void> => {
  console.debug('container_update: name=%s, color=%s, icon=%s, cookieStoreId=%s', name, color, icon, cookieStoreId);
  const contextualIdentity = await ContextualIdentity.get(cookieStoreId);
  await contextualIdentity.setParams({name, color, icon});
};

messagingService.addListener('reopen_tab_in_container', async (message) => {
  if (null == message || typeof message != 'object' || !('tabId' in message) || !('cookieStoreId' in message)) return;
  const active = ('active' in message) ? !!message.active : false;
  const {tabId, cookieStoreId} = message;
  await reopenTabInContainer(tabId as number, cookieStoreId as string, active);
});

messagingService.addListener('open_new_tab_in_container', async (message) => {
  if (null == message || typeof message != 'object' || !('cookieStoreId' in message)) return;
  const active = ('active' in message) ? !!message.active : false;
  const {cookieStoreId} = message;
  await openNewTabInContainer(cookieStoreId as string, active);
});

messagingService.addListener('container_create', async (message) => {
  if (null == message || typeof message != 'object' || !('name' in message) || !('color' in message) || !('icon' in message)) return;
  const {name, color, icon} = message;
  const cookieStoreId = await containerCreate(name as string, color as string, icon as string);
  return cookieStoreId;
});

messagingService.addListener('container_update', async (message) => {
  if (null == message || typeof message != 'object' || !('name' in message) || !('color' in message) || !('icon' in message) || !('cookieStoreId' in message)) return;
  const {name, color, icon, cookieStoreId} = message;
  await containerUpdate(name as string, color as string, icon as string, cookieStoreId as string);
  return cookieStoreId;
});
