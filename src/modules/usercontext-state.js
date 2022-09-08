// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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
import { WebExtensionsBroadcastChannel } from './broadcasting';
import { UserContext } from '../frameworks/tabGroups';

const syncActiveUserContextChannel = new WebExtensionsBroadcastChannel('sync_active_user_context');

const activeUserContextIdByWindow = new Map;

const forceUpdate = () => {
  browser.tabs.query({active: true}).then((tabs) => {
    for (const tab of tabs) {
      const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
      if (tab.url == 'about:blank' && tab.status == 'loading' && activeUserContextIdByWindow.has(tab.windowId)) {
        continue;
      }
      activeUserContextIdByWindow.set(tab.windowId, userContextId);
    }
  }).catch((e) => {
    console.error(e);
  });
};

browser.windows.onRemoved.addListener((windowId) => {
  activeUserContextIdByWindow.delete(windowId);
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  const tab = await browser.tabs.get(tabId);
  const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
  if (tab.status == 'loading' || tab.url == 'about:blank') {
    return;
  }
  activeUserContextIdByWindow.set(tab.windowId, userContextId);
  //console.log('active userContext: %d for window %d', userContextId, tab.windowId);
});

export const getActiveUserContext = (aWindowId) => {
  return activeUserContextIdByWindow.get(aWindowId) || 0;
};

export const setActiveUserContext = (aWindowId, aUserContextId) => {
  syncActiveUserContextChannel.postMessage({
    command: 'setActiveUserContext',
    windowId: 0 | aWindowId,
    userContextId: 0 | aUserContextId,
  });
};

syncActiveUserContextChannel.addEventListener('message', (ev) => {
  if (!ev.data) return;
  switch (ev.data.command) {
    case 'setActiveUserContext': {
      const {windowId, userContextId} = ev.data;
      activeUserContextIdByWindow.set(windowId, userContextId);
      break;
    }
  }
});

forceUpdate();

// startup workaround
setTimeout(() => forceUpdate(), 500);
