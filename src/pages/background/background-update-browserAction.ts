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

import { InitialWindowsService } from './InitialWindowsService';
import { DarkThemeMonitor } from '../../legacy-lib/themes/DarkThemeMonitor';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { WindowService } from '../../legacy-lib/tabs/WindowService';

import { config } from '../../config/config';
import { POPUP_PAGE } from '../../defs';

const DARK_THEME_BACKGROUND_COLOR = '#cccccc';
const LIGHT_THEME_BACKGROUND_COLOR = '#333333';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const initialWindowsService = InitialWindowsService.getInstance();
const windowService = WindowService.getInstance();

const setBadgeTextForBrowserWindow = (browserWindow: browser.Windows.Window) => {
  if (browserWindow.tabs == null) return;

  const tabCount = browserWindow.tabs.length;
  browser.browserAction.setBadgeText({
    text: tabCount.toString(),
    windowId: browserWindow.id,
  }).catch((e) => {
    console.error(e);
  });
};

const setBadgeTextForBrowserWindowId = (windowId: number) => {
  windowService.isPrivateWindow(windowId).then((isPrivate) => {
    if (isPrivate) return;
    browser.windows.get(windowId, {
      populate: true,
    }).then((browserWindow) => {
      setBadgeTextForBrowserWindow(browserWindow);
    }).catch((e) => {
      console.error(e);
    });
  });
};

const setBadgeTheme = (isDarkTheme: boolean) => {
  const backgroundColor = isDarkTheme ? DARK_THEME_BACKGROUND_COLOR : LIGHT_THEME_BACKGROUND_COLOR;
  browser.browserAction.setBadgeBackgroundColor({
    color: backgroundColor,
  }).catch((e) => {
    console.error(e);
  });
};

const setPopupSize = (large: boolean) => {
  browser.browserAction.setPopup({
    popup: POPUP_PAGE + (large ? '?popup=1&large=1' : '?popup=1'),
  }).catch((e) => {
    console.error(e);
  });
};

config['appearance.popupSize'].observe((value) => {
  console.debug('appearance.popupSize changed:', value);
  setPopupSize(value === 'large');
});

initialWindowsService.getInitialWindows().then((browserWindows) => {
  browserWindows.forEach((browserWindow) => {
    setBadgeTextForBrowserWindow(browserWindow);
  });
});

browser.windows.onCreated.addListener((browserWindow) => {
  setBadgeTextForBrowserWindow(browserWindow);
});

browser.tabs.onCreated.addListener((tab) => {
  if (null == tab.windowId) return;
  const windowId = tab.windowId;
  setBadgeTextForBrowserWindowId(windowId);
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;
  const windowId = removeInfo.windowId;
  setBadgeTextForBrowserWindowId(windowId);
});

const themeMonitor = new DarkThemeMonitor();
const isDarkTheme = themeMonitor.isDarkTheme;
setBadgeTheme(isDarkTheme);

themeMonitor.onChanged.addListener(() => {
  const isDarkTheme = themeMonitor.isDarkTheme;
  setBadgeTheme(isDarkTheme);
});
