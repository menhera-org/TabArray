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
import { OpenTabsService } from '../lib/states/OpenTabsService';
import { TabStateStore } from './includes/TabStateStore';

import { injectExtensionContentScript } from './includes/ext-content';
import { TabState } from './includes/TabState';

import { OPEN_CONTAINER_PAGE } from '../defs';

const tabPreviewService = TabPreviewService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const openTabsService = OpenTabsService.getInstance();
const tabStateStore = TabStateStore.getInstance();

browser.tabs.onUpdated.addListener((_tabId, _changeInfo, browserTab) => {
  try {
    const tabState = TabState.createFromBrowserTab(browserTab);
    if (tabState.url == 'about:blank' && tabState.isLoading) return;
    if (tabState.isLoading == false) {
      tabPreviewService.updateTabPreview(tabState.id).catch((e) => {
        console.warn(e);
      });
    }

    const url = new URL(tabState.url);

    // handle "open container" page
    if (url.origin == location.origin && url.protocol == location.protocol && url.pathname == OPEN_CONTAINER_PAGE) {
      const cookieStoreId = url.searchParams.get('cookieStoreId') || CookieStore.DEFAULT.id;
      containerTabOpenerService.openNewTabInContainer(cookieStoreId, true, tabState.windowId).then(() => {
        return browser.tabs.remove(tabState.id);
      }).catch((e) => {
        console.error(e);
      });
      return;
    }

    injectExtensionContentScript(browserTab);
    openTabsService.hasTab(tabState.id).then((hasTab) => {
      if (!hasTab) {
        tabStateStore.onBeforeTabCreated.dispatch(tabState);
      }
    });
  } catch (e) {
    console.error(e);
  }
}, {
  properties: ['status', 'url'],
});
