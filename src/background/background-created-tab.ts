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

import browser from "webextension-polyfill";
import { CookieStore } from 'weeg-containers';

import { NewTabPageService } from '../lib/tabs/NewTabPageService';
import { ActiveContainerService } from '../lib/states/ActiveContainerService';
import { ContainerTabOpenerService } from "../lib/tabGroups/ContainerTabOpenerService";
import { IndexTabService } from "../lib/tabs/IndexTabService";
import { ExtensionPageService } from "../lib/ExtensionPageService";
import { ContainerHistoryService } from "../lib/history/ContainerHistoryService";

import { hideAll } from "../legacy-lib/modules/containers";

import { config } from '../config/config';

import { TabState } from "./includes/TabState";
import { TabStateStore } from './includes/TabStateStore';

const tabStateStore = TabStateStore.getInstance();
const newTabPageService = NewTabPageService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const indexTabService = IndexTabService.getInstance();
const extensionPageService = ExtensionPageService.getInstance();
const containerHistoryService = ContainerHistoryService.getInstance<ContainerHistoryService>();

const setActiveContainerIfActive = (tabState: TabState) => {
  if (!extensionPageService.isConfirmPage(tabState.url) && tabState.active && tabState.cookieStoreId != CookieStore.PRIVATE.id) {
    activeContainerService.setActiveContainer(tabState.windowId, tabState.cookieStoreId).catch((e) => {
      console.error(e);
    });
  }
};

tabStateStore.onBeforeTabCreated.addListener(async (tabState) => {
  const windowId = tabState.windowId;

  if (tabState.cookieStoreId == CookieStore.DEFAULT.id && null == tabState.openerTabId) {
    const [configNewTabInContainerEnabled, newTabPageUrl, activeCookieStoreId] = await Promise.all([
      config['newtab.keepContainer'].getValue(),
      newTabPageService.getNewTabPageUrl(),
      activeContainerService.getActiveContainer(windowId),
    ]);
    if (configNewTabInContainerEnabled && newTabPageUrl == tabState.url && activeCookieStoreId != CookieStore.DEFAULT.id && null != activeCookieStoreId) {
      await browser.tabs.remove(tabState.id);
      await containerTabOpenerService.openNewTabInContainer(activeCookieStoreId, true, windowId);
      return;
    }
  }
  if (undefined !== await indexTabService.getIndexTabUserContextId(tabState.id)) {
    return;
  }

  setActiveContainerIfActive(tabState);
  tabStateStore.handleOpenedTab(tabState);
});

tabStateStore.onTabActivated.addListener((tabState) => {
  setActiveContainerIfActive(tabState);
});

activeContainerService.onContainerActivated.addListener(({windowId, cookieStoreId}) => {
  containerHistoryService.addHistoryEntry(cookieStoreId);
  config['tab.autoHide.enabled'].getValue().then((autoHideEnabled) => {
    if (autoHideEnabled) {
      return hideAll(windowId);
    }
  }).catch((e) => {
    console.error(e);
  });
});
