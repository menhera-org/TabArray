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

import { CompatConsole } from '../lib/console/CompatConsole';
import { WindowTabCountService, TabCountByWindow, WindowTabCountHistory } from '../lib/windows/WindowTabCountService';
import { BrowserActionService } from '../lib/browserAction/BrowserActionService';
import { ActiveContainerService } from '../lib/states/ActiveContainerService';
import { OpenTabsService } from '../lib/states/OpenTabsService';

import { DarkThemeMonitor } from '../legacy-lib/themes/DarkThemeMonitor';

import { config } from '../config/config';

import { InitialWindowsService } from './includes/InitialWindowsService';
import { injectExtensionContentScript } from './includes/ext-content';
import { reopenNewTab, doBatchOperationOnInitialWindows } from './includes/active-container';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const initialWindowsService = InitialWindowsService.getInstance();
const windowTabCountService = WindowTabCountService.getInstance<WindowTabCountService>();
const browserActionService = BrowserActionService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();
const openTabsService = OpenTabsService.getInstance();

config['appearance.popupSize'].observe((value) => {
  console.debug('appearance.popupSize changed:', value);
  browserActionService.setPopupSize(value === 'large');
});

initialWindowsService.getInitialWindows().then((browserWindows) => {
  const tabCountByWindow: TabCountByWindow = {};
  for (const browserWindow of browserWindows) {
    if (browserWindow.id == null || browserWindow.tabs == null || browserWindow.incognito) continue;
    tabCountByWindow[browserWindow.id] = browserWindow.tabs.length;
    for (const browserTab of browserWindow.tabs) {
      injectExtensionContentScript(browserTab);
    }
  }
  windowTabCountService.setInitialTabCounts(tabCountByWindow).catch((e) => {
    console.error(e);
  });
  doBatchOperationOnInitialWindows(browserWindows);
});

browser.windows.onCreated.addListener((browserWindow) => {
  const tabCount = browserWindow.tabs?.length ?? 1;
  const windowId = browserWindow.id;
  if (windowId == null) return;
  if (browserWindow.incognito) return;
  windowTabCountService.addWindow(windowId, tabCount);
});

browser.windows.onRemoved.addListener((windowId) => {
  windowTabCountService.removeWindow(windowId);
  activeContainerService.removeWindow(windowId).catch((e) => {
    console.error(e);
  });
});

browser.tabs.onCreated.addListener((browserTab) => {
  if (null == browserTab.windowId) return;
  const windowId = browserTab.windowId;
  windowTabCountService.incrementTabCountForWindow(windowId);
  reopenNewTab(browserTab);
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const windowId = removeInfo.windowId;
  if (removeInfo.isWindowClosing) return;
  windowTabCountService.decrementTabCountForWindow(windowId);
  openTabsService.removeTab(tabId).catch((e) => {
    console.error(e);
  });
});

windowTabCountService.onChanged.addListener((tabCountHistory) => {
  const windowIds = WindowTabCountHistory.getWindowIds(tabCountHistory);
  for (const windowId of windowIds) {
    const tabCount = WindowTabCountHistory.getLastTabCountForWindow(tabCountHistory, windowId) as number;
    if (tabCount < 1) return;
    browserActionService.setBadgeTextForWindow(windowId, tabCount);
  }
});

const themeMonitor = new DarkThemeMonitor();
const isDarkTheme = themeMonitor.isDarkTheme;
browserActionService.setBadgeTheme(isDarkTheme);

themeMonitor.onChanged.addListener(() => {
  const isDarkTheme = themeMonitor.isDarkTheme;
  browserActionService.setBadgeTheme(isDarkTheme);
});
