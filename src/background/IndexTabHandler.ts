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
import * as containers from '../modules/containers';
import { IndexTab } from '../modules/IndexTab';
import { WindowUserContextList } from '../frameworks/tabGroups';

browser.tabs.onRemoved.addListener(async (tabId, {windowId, isWindowClosing}) => {
  try {
    const indexTabUserContextId = await browser.sessions.getTabValue(tabId, 'indexTabUserContextId');
    if (indexTabUserContextId == null) {
      throw void 0;
    }
    // index closed, close all tabs of that group
    await containers.closeAllTabsOnWindow(indexTabUserContextId, windowId);
    return;
  } catch (e) {
    // nothing.
  }

  if (isWindowClosing) return;
  const list = await WindowUserContextList.create(windowId);
  for (const userContext of list.getOpenUserContexts()) {
    const tabs = [... list.getUserContextTabs(userContext.id)];

    // if the only remaining tab is the index tab, close it
    if (tabs[0] && tabs.length == 1 && IndexTab.isIndexTabUrl(tabs[0].url)) {
      await tabs[0].close();
    }
  }
});

// prevent index tabs from being pinned
browser.tabs.onUpdated.addListener(async (tabId) => {
  try {
    const indexTabUrl = await browser.sessions.getTabValue(tabId, 'indexTabUrl');
    if (!indexTabUrl) {
      throw void 0;
    }
    await browser.tabs.update(tabId, {
      pinned: false,
    });
  } catch (e) {
    // nothing.
  }
}, {
  properties: [
    'pinned',
  ],
});
