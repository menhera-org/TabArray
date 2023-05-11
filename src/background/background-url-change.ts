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

import { TabPreviewService } from '../lib/tabs/TabPreviewService';
import { ContainerTabOpenerService } from '../lib/tabGroups/ContainerTabOpenerService';

import { injectExtensionContentScript } from './includes/ext-content';
import { handleTabUrlUpdate } from './includes/active-container';

import { OPEN_CONTAINER_PAGE } from '../defs';

const tabPreviewService = TabPreviewService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();

browser.tabs.onUpdated.addListener((tabId, _changeInfo, browserTab) => {
  if (browserTab.status == 'complete' && browserTab.url && browserTab.url != 'about:blank') {
    tabPreviewService.updateTabPreview(tabId).catch((e) => {
      console.warn(e);
    });
  }
  injectExtensionContentScript(browserTab);
  handleTabUrlUpdate(browserTab);

  // handle "open container" page
  if (browserTab.url && browserTab.url != 'about:blank') {
    const url = new URL(browserTab.url);
    if (url.origin == location.origin && url.protocol == location.protocol && url.pathname == OPEN_CONTAINER_PAGE) {
      const cookieStoreId = url.searchParams.get('cookieStoreId') || CookieStore.DEFAULT.id;
      containerTabOpenerService.openNewTabInContainer(cookieStoreId, true, browserTab.windowId).then(() => {
        return browser.tabs.remove(tabId);
      }).catch((e) => {
        console.error(e);
      });
    }
  }
}, {
  properties: ['status', 'url'],
});
