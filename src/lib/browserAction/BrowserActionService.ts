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

import { ServiceRegistry } from '../ServiceRegistry';

import { POPUP_PAGE } from "../../defs";

export class BrowserActionService {
  public static readonly DARK_THEME_BACKGROUND_COLOR = '#cccccc';
  public static readonly LIGHT_THEME_BACKGROUND_COLOR = '#333333';

  private static readonly INSTANCE = new BrowserActionService();

  public static getInstance(): BrowserActionService {
    return BrowserActionService.INSTANCE;
  }

  private constructor() {
    // Do nothing
  }

  public setBadgeTextForWindow(windowId: number, tabCount: number) {
    browser.browserAction.setBadgeText({
      text: tabCount.toString(),
      windowId,
    }).catch((e) => {
      console.error(e);
    });
  }

  public setBadgeTheme(isDarkTheme: boolean) {
    const backgroundColor = isDarkTheme ? BrowserActionService.DARK_THEME_BACKGROUND_COLOR : BrowserActionService.LIGHT_THEME_BACKGROUND_COLOR;
    browser.browserAction.setBadgeBackgroundColor({
      color: backgroundColor,
    }).catch((e) => {
      console.error(e);
    });
  }

  public setPopupSize(large: boolean) {
    browser.browserAction.setPopup({
      popup: POPUP_PAGE + (large ? '?popup=1&large=1' : '?popup=1'),
    }).catch((e) => {
      console.error(e);
    });
  }
}

ServiceRegistry.getInstance().registerService('BrowserActionService', BrowserActionService.getInstance());
