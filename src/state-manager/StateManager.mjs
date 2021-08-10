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

import { BrowserWindow } from "./lib/BrowserWindow.mjs";
import { BrowserTab } from "./lib/BrowserTab.mjs";
import { UserContext } from "./lib/UserContext.mjs";
import * as i18n from '../modules/i18n.mjs';
import { LifecycleEventTarget } from "./lib/LifecycleEventTarget.mjs";

const startTime = +new Date;

export const state = new class StateManager extends LifecycleEventTarget {
  // Map from windowId (int) to BrowserWindow
  _browserWindows = new Map;

  // Map from tabId (int) to BrowserTab
  _browserTabs = new Map;

  // Map from userContextId (int) to UserContext
  _userContexts = new Map;

  // Set of userContextId(s) (int) currently in use (open tabs)
  _openUserContextIds = new Set;

  _initialized = false;

  constructor() {
    super();
  }

  get initialized() {
    return this._initialized;
  }

  getUserContext(aUserContextId) {
    const userContextId = Math.max(0, 0 | aUserContextId);
    if (this._userContexts.has(userContextId)) {
      return this._userContexts.get(userContextId);
    } else {
      const userContext = new UserContext(userContextId);
      userContext.stateManager = state;
      userContext.name = i18n.getMessage('invalidContainerName', userContextId);
      userContext.isDefined = false;
      return userContext;
    }
  }

  getBrowserWindow(aWindowId) {
    const windowId = 0 | aWindowId;
    if (this._browserWindows.has(windowId)) {
      return this._browserWindows.get(windowId);
    }
    return null;
  }

  getBrowserTab(aTabId) {
    const tabId = 0 | aTabId;
    if (this._browserTabs.has(tabId)) {
      return this._browserTabs.get(tabId);
    }
    return null;
  }

  getUserContexts() {
    const userContexts = [... this._userContexts.values()];
    userContexts.sort((userContext1, userContext2) => userContext1.id - userContext2.id);
    return userContexts;
  }

  getBrowserWindows() {
    const browserWindows = [... this._browserWindows.values()];
    browserWindows.sort((browserWindow1, browserWindow2) => browserWindow1.id - browserWindow2.id);
    return browserWindows;
  }

  getBrowserTabs() {
    const browserTabs = [... this._browserTabs.values()];
    browserTabs.sort((browserTab1, browserTab2) => browserTab1.id - browserTab2.id);
    return browserTabs;
  }
};

globalThis.StateManager = state;

const getBrowserWindow = (windowId) => {
  if (state._browserWindows.has(windowId)) {
    return state._browserWindows.get(windowId);
  }
  const browserWindow = new BrowserWindow(windowId);
  browserWindow.stateManager = state;
  state._browserWindows.set(windowId, browserWindow);
  state.dispatchEvent(new CustomEvent('windowOpen', {
    cancelable: false,
    detail: {
      windowId,
    },
  }));
  return browserWindow;
};

const updateTabInfo = (tabObj) => {
  let browserTab;
  let tabCreated = false;
  if (state._browserTabs.has(tabObj.id)) {
    browserTab = state._browserTabs.get(tabObj.id);
  } else {
    browserTab = new BrowserTab(tabObj.id);
    tabCreated = true;
  }
  const userContextId = UserContext.toUserContextId(tabObj.cookieStoreId);
  browserTab.userContextId = userContextId;
  browserTab.windowId = tabObj.windowId;
  if (browserTab.url != tabObj.url && tabObj.url && tabObj.url != 'about:blank') {
    browserTab.url = tabObj.url;
    browser.tabs.captureTab(browserTab.id, {scale: .25}).then((url) => {
      browserTab.previewUrl = url;
    }).catch((e) => {
      console.warn('Error in captureTab:', e);
    });
  }
  browserTab.initialized = !!browserTab.url && browserTab.url != 'about:blank';
  browserTab.favIconUrl = tabObj.favIconUrl || '';
  browserTab.index = tabObj.index;
  browserTab.discarded = !!tabObj.discarded;
  browserTab.active = !!tabObj.active;
  browserTab.title = tabObj.title || '';
  const browserWindow = getBrowserWindow(browserTab.windowId);
  browserWindow.tabIds.add(browserTab.id);
  const userContext = state._userContexts.get(userContextId);
  if (userContext) {
    userContext.tabIds.add(browserTab.id);
  }
  const pinChanged = (browserTab.pinned != !!tabObj.pinned) && !tabCreated;
  browserTab.pinned = !!tabObj.pinned;
  const hiddenChanged = (browserTab.hidden != !!tabObj.hidden) && !tabCreated;
  browserTab.hidden = !!tabObj.hidden;
  let activeTabChanged = false;
  if (browserTab.active) {
    if (browserWindow.activeTabId != browserTab.id) {
      browserWindow.activeTabId = browserTab.id;
      activeTabChanged = true;
      for (const browserTab of browserWindow.getTabs()) {
        if (browserWindow.activeTabId != browserTab.id) {
          browserTab.active = false;
        }
      }
    }
  }
  if (tabCreated) {
    state._browserTabs.set(browserTab.id, browserTab);
    const previousTabCount = browserWindow.tabIds.size - 1;
    if (previousTabCount > browserTab.index) {
      const browserTabs = browserWindow.getTabs();
      let shiftedTabCount = 0;
      for (const otherTab of browserTabs) {
        if (otherTab.id == browserTab.id) continue;
        if (otherTab.index >= browserTab.index) {
          otherTab.index = otherTab.index + 1;
          shiftedTabCount++;
        }
      }
      console.log('Shifted %d tab(s) to end at index %d on window %d', shiftedTabCount, browserTab.index, browserTab.windowId);
    }
    browserWindow.dispatchEvent(new CustomEvent('tabOpen', {
      cancelable: false,
      detail: {
        tabId: browserTab.id,
        userContextId,
      },
    }));
    state.dispatchEvent(new CustomEvent('tabOpen', {
      cancelable: false,
      detail: {
        tabId: browserTab.id,
        windowId: browserTab.windowId,
        userContextId,
      },
    }));
  } else {
    if (pinChanged) {
      if (browserTab.pinned) {
        browserTab.dispatchEvent(new CustomEvent('pinned', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
        browserWindow.dispatchEvent(new CustomEvent('tabPinned', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            userContextId,
          },
        }));
        state.dispatchEvent(new CustomEvent('tabPinned', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            tabId: browserTab.id,
            userContextId,
          },
        }));
      } else {
        browserTab.dispatchEvent(new CustomEvent('unpinned', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
        browserWindow.dispatchEvent(new CustomEvent('tabUnpinned', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            userContextId,
          },
        }));
        state.dispatchEvent(new CustomEvent('tabUnpinned', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            tabId: browserTab.id,
            userContextId,
          },
        }));
      }
    }
    if (hiddenChanged) {
      if (browserTab.hidden) {
        // tab is made hidden
        browserTab.dispatchEvent(new CustomEvent('hide', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
        browserWindow.dispatchEvent(new CustomEvent('tabHide', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            userContextId,
          },
        }));
        state.dispatchEvent(new CustomEvent('tabHide', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
      } else {
        // tab is made visible
        browserTab.dispatchEvent(new CustomEvent('show', {
          cancelable: false,
          detail: {
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
        browserWindow.dispatchEvent(new CustomEvent('tabShow', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            userContextId,
          },
        }));
        state.dispatchEvent(new CustomEvent('tabShow', {
          cancelable: false,
          detail: {
            tabId: browserTab.id,
            windowId: browserTab.windowId,
            userContextId,
          },
        }));
      }
    }
    browserTab.dispatchEvent(new CustomEvent('change', {
      cancelable: false,
      detail: {
        windowId: browserTab.windowId,
        userContextId,
      },
    }));
    browserWindow.dispatchEvent(new CustomEvent('tabChange', {
      cancelable: false,
      detail: {
        tabId: browserTab.id,
        userContextId,
      },
    }));
    state.dispatchEvent(new CustomEvent('tabChange', {
      cancelable: false,
      detail: {
        tabId: browserTab.id,
        windowId: browserTab.windowId,
        userContextId,
      },
    }));
  }
  if (activeTabChanged) {
    browserWindow.dispatchEvent(new CustomEvent('activeTabChange', {
      cancelable: false,
      detail: {
        tabId: browserTab.id,
        userContextId,
        tabIndex: browserTab.index,
      },
    }));
    state.dispatchEvent(new CustomEvent('activeTabChange', {
      cancelable: false,
      detail: {
        windowId: browserTab.windowId,
        tabId: browserTab.id,
        userContextId,
        tabIndex: browserTab.index,
      },
    }));
  }
  return browserTab;
};

const updateTabById = async (tabId) => {
  const tabObj = await browser.tabs.get(tabId);
  updateTabInfo(tabObj);
};

const updateWindowInfo = (windowObj) => {
  const browserWindow = getBrowserWindow(windowObj.id);
  browserWindow.isNormal = windowObj.type == 'normal';
};

// collect information about browser windows
const initialization = {
  browserWindows: browser.windows.getAll({
    populate: false,
    windowTypes: ['normal', 'panel', 'popup', 'devtools'],
  }).then((windows) => {
    for (const windowObj of windows) {
      updateWindowInfo(windowObj);
    }
    return windows;
  }),

  userContexts: browser.contextualIdentities.query({}).then((contextualIdentities) => {
    {
      // no container
      const userContext = new UserContext(0);
      userContext.stateManager = state;
      userContext.name = i18n.getMessage('noContainer');
      state._userContexts.set(0, userContext);
    }

    for (const contextualIdentity of contextualIdentities) {
      const userContextId = UserContext.toUserContextId(contextualIdentity.cookieStoreId);
      const userContext = new UserContext(userContextId);
      userContext.stateManager = state;
      userContext.name = contextualIdentity.name;
      userContext.iconName = contextualIdentity.icon;
      userContext.iconUrl = contextualIdentity.iconUrl;
      userContext.colorName = contextualIdentity.color;
      userContext.colorCode = contextualIdentity.colorCode;
      state._userContexts.set(userContextId, userContext);
    }
    return contextualIdentities;
  }),

  browserTabs: browser.tabs.query({}).then((tabs) => {
    for (const tabObj of tabs) {
      updateTabInfo(tabObj);
    }
  }),
};

initialization.browserTabsAndUserContexts = Promise.all([
  initialization.userContexts,
  initialization.browserTabs,
]).then(() => {
  // UserContext data and tab data are ready
  for (const [tabId, browserTab] of state._browserTabs) {
    const userContext = state.getUserContext(browserTab.userContextId);
    userContext.tabIds.add(tabId);
  }
});

initialization.browserTabsAndBrowserWindows = Promise.all([
  initialization.browserTabs,
  initialization.browserWindows,
]).then(() => {
  // BrowserTab data and BrowserWindow data are ready.
  for (const [tabId, tab] of state._browserTabs) {
    const browserWindow = getBrowserWindow(tab.windowId);
    browserWindow.tabIds.add(tabId);
  }
});

Promise.all([
  initialization.browserTabsAndUserContexts,
  initialization.browserTabsAndBrowserWindows,
]).then(() => {
  state._initialized = true;
  state.dispatchEvent(new CustomEvent('initialized', {
    cancelable: false,
    detail: {
      // initialization delay in milliseconds
      initializationDelay: (+new Date) - startTime,
    },
  }));
});

// Update information about UserContexts
browser.contextualIdentities.onCreated.addListener(({contextualIdentity}) => {
  const userContextId = UserContext.toUserContextId(contextualIdentity.cookieStoreId);
  const userContext = new UserContext(userContextId);
  userContext.stateManager = state;
  userContext.name = contextualIdentity.name;
  userContext.iconName = contextualIdentity.icon;
  userContext.iconUrl = contextualIdentity.iconUrl;
  userContext.colorName = contextualIdentity.color;
  userContext.colorCode = contextualIdentity.colorCode;
  state._userContexts.set(userContextId, userContext);
  state.dispatchEvent(new CustomEvent('userContextCreate', {
    cancelable: false,
    detail: {
      userContextId,
      userContext,
    },
  }));
});

browser.contextualIdentities.onRemoved.addListener(({contextualIdentity}) => {
  const userContextId = UserContext.toUserContextId(contextualIdentity.cookieStoreId);
  const userContext = state._userContexts.get(userContextId);
  if (!userContext) {
    console.warn('assertion failed: no such UserContext: %d', userContextId);
    return;
  }
  state._userContexts.delete(userContextId);
  userContext.isDefined = false;
  userContext.dispatchEvent(new CustomEvent('remove', {
    cancelable: false,
    detail: {
      userContextId,
    },
  }));
  state.dispatchEvent(new CustomEvent('userContextRemove', {
    cancelable: false,
    detail: {
      userContextId,
    },
  }));
});

browser.contextualIdentities.onUpdated.addListener(({contextualIdentity}) => {
  const userContextId = UserContext.toUserContextId(contextualIdentity.cookieStoreId);
  let userContext = state._userContexts.get(userContextId);
  let isNew = false;
  if (!userContext) {
    console.warn('assertion failed: no such UserContext: %d', userContextId);
    userContext = new UserContext(userContextId);
    userContext.stateManager = state;
    state._userContexts.set(userContextId, userContext);
    isNew = true;
  }
  userContext.name = contextualIdentity.name;
  userContext.iconName = contextualIdentity.icon;
  userContext.iconUrl = contextualIdentity.iconUrl;
  userContext.colorName = contextualIdentity.color;
  userContext.colorCode = contextualIdentity.colorCode;
  if (isNew) {
    state.dispatchEvent(new CustomEvent('userContextCreate', {
      cancelable: false,
      detail: {
        userContextId,
      },
    }));
  } else {
    userContext.dispatchEvent(new CustomEvent('change', {
      cancelable: false,
      detail: {
        userContextId,
      },
    }));
    state.dispatchEvent(new CustomEvent('userContextChange', {
      cancelable: false,
      detail: {
        userContextId,
      },
    }));
  }
});

browser.tabs.onRemoved.addListener((tabId, {windowId}) => {
  const browserTab = state._browserTabs.get(tabId);
  if (!browserTab) {
    console.warn('assertion failed: no such BrowserTab');
    return;
  }
  state._browserTabs.delete(tabId);
  browserTab.windowId = windowId;
  browserTab.closed = true;
  const userContext = state.getUserContext(browserTab.userContextId);
  userContext.tabIds.delete(tabId);
  const browserWindow = getBrowserWindow(browserTab.windowId);
  browserWindow.tabIds.delete(browserTab.id);

  // workaround
  const removedIndex = browserTab.index;
  let visited = false;
  let indexShifted = false;
  for (const browserTab of browserWindow.getTabs()) {
    if (browserTab.index == removedIndex) {
      visited = true;
    }
    if (browserTab.index > removedIndex && !visited) {
      browserTab.index = browserTab.index - 1;
      indexShifted = true;
    }
  }
  if (indexShifted) {
    console.log('Index shift at index %d on window %d', removedIndex, windowId);
  }

  browserTab.dispatchEvent(new Event('close', {
    cancelable: false,
  }));
  userContext.dispatchEvent(new CustomEvent('tabClose', {
    cancelable: false,
    detail: {
      tabId,
      windowId,
    },
  }));
  browserWindow.dispatchEvent(new CustomEvent('tabClose', {
    cancelable: false,
    detail: {
      tabId,
      userContextId: browserTab.userContextId,
    },
  }));
  state.dispatchEvent(new CustomEvent('tabClose', {
    cancelable: false,
    detail: {
      tabId,
      windowId,
      userContextId: browserTab.userContextId,
    },
  }));
});

browser.tabs.onCreated.addListener((tabObj) => {
  if (state._browserTabs.has(tabObj.id)) {
    console.warn('assertion failed: BrowserTab already exists');
    return;
  }
  const browserTab = updateTabInfo(tabObj);
  const {userContextId} = browserTab;
  const browserWindow = getBrowserWindow(browserTab.windowId);
  //browserWindow.tabIds.add(browserTab.id);
});

browser.tabs.onAttached.addListener((tabId, {newWindowId, newPosition}) => {
  const browserTab = state._browserTabs.get(tabId);
  if (!browserTab) {
    console.warn('assertion failed: no such BrowserTab: %d', tabId);
    updateTabById(tabId).catch((e) => {
      console.error(e);
    });
    return;
  }
  browserTab.index = 0 | newPosition;
  browserTab.windowId = 0 | newWindowId;
  const browserWindow = getBrowserWindow(newWindowId);
  browserWindow.tabIds.add(tabId);
  browserTab.dispatchEvent(new CustomEvent('attach', {
    cancelable: false,
    detail: {
      windowId: browserWindow.id,
      tabId: browserTab.id,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
  browserWindow.dispatchEvent(new CustomEvent('tabAttach', {
    cancelable: false,
    detail: {
      windowId: browserWindow.id,
      tabId: browserTab.id,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
  if (state._userContexts.has(browserTab.userContextId)) {
    const userContext = state._userContexts.get(browserTab.userContextId);
    userContext.dispatchEvent(new CustomEvent('tabWindowChange', {
      cancelable: false,
      detail: {
        windowId: browserWindow.id,
        tabId: browserTab.id,
      },
    }));
  }
  state.dispatchEvent(new CustomEvent('tabWindowChange', {
    cancelable: false,
    detail: {
      windowId: browserWindow.id,
      tabId: browserTab.id,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
});

browser.tabs.onDetached.addListener((tabId, {oldWindowId, oldPosition}) => {
  const browserTab = state._browserTabs.get(tabId);
  if (!browserTab) {
    console.warn('assertion failed: no such BrowserTab: %d', tabId);
    return;
  }
  const oldBrowserWindow = getBrowserWindow(oldWindowId);
  oldBrowserWindow.tabIds.delete(tabId);
  browserWindow.dispatchEvent(new CustomEvent('tabDetach', {
    cancelable: false,
    detail: {
      windowId: oldBrowserWindow.id,
      tabId: browserTab.id,
      tabIndex: oldPosition,
      userContextId: browserTab.userContextId,
    },
  }));
});

browser.tabs.onMoved.addListener((tabId, {windowId, fromIndex, toIndex}) => {
  const browserWindow = getBrowserWindow(windowId);
  browserWindow.tabIds.add(tabId);
  const browserTab = state._browserTabs.get(tabId);
  if (!browserTab) {
    console.warn('assertion failed: no such BrowserTab: %d', tabId);
    updateTabById(tabId).catch((e) => {
      console.error(e);
    });
    return;
  }
  browserTab.index = toIndex;
  browserTab.dispatchEvent(new CustomEvent('move', {
    cancelable: false,
    detail: {
      windowId: browserWindow.id,
      oldTabIndex: fromIndex,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
  browserWindow.dispatchEvent(new CustomEvent('tabMove', {
    cancelable: false,
    detail: {
      tabId: browserTab.id,
      oldTabIndex: fromIndex,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
  state.dispatchEvent(new CustomEvent('tabMove', {
    cancelable: false,
    detail: {
      windowId: browserWindow.id,
      tabId: browserTab.id,
      oldTabIndex: fromIndex,
      tabIndex: browserTab.index,
      userContextId: browserTab.userContextId,
    },
  }));
});

browser.tabs.onActivated.addListener(({tabId, windowId, previousTabId}) => {
  const browserTab = state._browserTabs.get(tabId);
  if (!browserTab) {
    console.warn('assertion failed: no such BrowserTab: %d', tabId);
    updateTabById(tabId).catch((e) => {
      console.error(e);
    });
    return;
  }
  browserTab.active = true;
  const userContextId = browserTab.userContextId;
  const browserWindow = getBrowserWindow(windowId);
  if (tabId != browserWindow.activeTabId) {
    {
      const previousActiveBrowserTab = state._browserTabs.get(browserWindow.activeTabId);
      if (previousActiveBrowserTab) {
        previousActiveBrowserTab.active = false;
      }
    }
    {
      const previousActiveBrowserTab = state._browserTabs.get(previousTabId);
      if (previousActiveBrowserTab) {
        previousActiveBrowserTab.active = false;
      }
    }
    browserWindow.activeTabId = tabId;
    for (const browserTab of browserWindow.getTabs()) {
      if (browserWindow.activeTabId != browserTab.id) {
        browserTab.active = false;
      }
    }
    browserWindow.dispatchEvent(new CustomEvent('activeTabChange', {
      cancelable: false,
      detail: {
        tabId,
        userContextId,
        tabIndex: browserTab.index,
      },
    }));
    state.dispatchEvent(new CustomEvent('activeTabChange', {
      cancelable: false,
      detail: {
        windowId: browserTab.windowId,
        tabId,
        userContextId,
        tabIndex: browserTab.index,
      },
    }));
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabObj) => {
  updateTabInfo(tabObj);
});

browser.windows.onRemoved.addListener((windowId) => {
  const browserWindow = state._browserWindows.get(windowId);
  if (!browserWindow) {
    console.warn('assertion failed: no such BrowserWindow: %d', windowId);
    return;
  }
  state._browserWindows.delete(windowId);
  browserWindow.closed = true;
  browserWindow.dispatchEvent(new CustomEvent('close', {
    cancelable: false,
    detail: {},
  }));
  state.dispatchEvent(new CustomEvent('windowClose', {
    cancelable: false,
    detail: {
      windowId,
    },
  }));
});

browser.windows.onCreated.addListener((windowObj) => {
  updateWindowInfo(windowObj);
});
