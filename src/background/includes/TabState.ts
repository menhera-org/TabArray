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

export interface TabState {
  id: number;
  windowId: number;
  cookieStoreId: string;
  active: boolean;
  url: string;
  isLoading: boolean;
  openerTabId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TabState {
  export function createFromBrowserTab(browserTab: browser.Tabs.Tab): TabState {
    if (browserTab.id == null || browserTab.windowId == null || browserTab.cookieStoreId == null) {
      throw new TypeError('Incomplete browser tab');
    }
    const url = browserTab.url ?? 'about:blank';
    const isComplete = browserTab.status == 'complate' && !(url == 'about:blank' && browserTab.title?.includes('/'));
    const value: TabState = {
      id: browserTab.id,
      windowId: browserTab.windowId,
      cookieStoreId: browserTab.cookieStoreId,
      active: browserTab.active,
      url,
      isLoading: !isComplete,
    };
    if (browserTab.openerTabId != null && browserTab.openerTabId > 0) {
      value.openerTabId = browserTab.openerTabId;
    }
    return value;
  }
}

export interface ContainerOnWindow {
  windowId: number;
  cookieStoreId: string;
}
