// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
import { CookieStore } from '../frameworks/tabAttributes';

const openTabAndCloseCurrent = async (url: string, cookieStoreId: string, windowId: number, currentTabId: number) => {
  const browserTab = await browser.tabs.create({
    url,
    cookieStoreId,
    windowId,
    active: false,
  });
  if (!browserTab.id) return;
  await Promise.all([
    browser.tabs.update(browserTab.id, {active: true}),
    browser.tabs.remove(currentTabId),
  ]);
};

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || !message.type) return;
  console.log('onMessage', message, sender);
  switch (message.type) {
    case 'reopen_tab_in_container': {
      if (!message.tabId || !message.cookieStoreId) return;
      const {tabId, cookieStoreId} = message;
      console.debug('reopen_tab_in_container: tabId=%d, cookieStoreId=%s', tabId, cookieStoreId);
      const browserTab = await browser.tabs.get(tabId);
      if (!browserTab.url || browserTab.url === 'about:blank' || !browserTab.cookieStoreId || !browserTab.windowId) {
        console.debug('reopen_tab_in_container: tabId=%d is incomplete, ignoring', tabId);
        return;
      }
      const currentCookieStore = CookieStore.fromId(browserTab.cookieStoreId);
      const targetCookieStore = CookieStore.fromId(cookieStoreId);
      if (currentCookieStore.isPrivate != targetCookieStore.isPrivate) {
        const browserWindows = (await browser.windows.getAll({windowTypes: ['normal']})).filter((browserWindow) => targetCookieStore.isPrivate == browserWindow.incognito);
        for (const browserWindow of browserWindows) {
          if (browserWindow.id == null) continue;
          await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserWindow.id, tabId);
          return;
        }
        Promise.all([
          browser.windows.create({
            url: browserTab.url,
            cookieStoreId: targetCookieStore.id,
            incognito: targetCookieStore.isPrivate,
          }),
          browser.tabs.remove(tabId),
        ]);
      } else {
        await openTabAndCloseCurrent(browserTab.url, targetCookieStore.id, browserTab.windowId, tabId);
      }
      break;
    }
  }
});
