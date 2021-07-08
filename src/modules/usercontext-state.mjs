// vim: ts=2 et ai

import { WebExtensionsBroadcastChannel } from './broadcasting.mjs';
import * as containers from './containers.mjs';

const syncActiveUserContextChannel = new WebExtensionsBroadcastChannel('sync_active_user_context');

const activeUserContextIdByWindow = new Map;

browser.windows.onRemoved.addListener((windowId) => {
  activeUserContextIdByWindow.delete(windowId);
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  const tab = await browser.tabs.get(tabId);
  const userContextId = containers.toUserContextId(tab.cookieStoreId);
  activeUserContextIdByWindow.set(tab.windowId, userContextId);
  console.log('active userContext: %d for window %d', userContextId, tab.windowId);
});

browser.tabs.query({active: true}).then((tabs) => {
  for (const tab of tabs) {
    const userContextId = containers.toUserContextId(tab.cookieStoreId);
    activeUserContextIdByWindow.set(tab.windowId, userContextId);
  }
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
