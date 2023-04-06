// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { Tab } from '../frameworks/tabs';
import { IndexTab } from '../modules/IndexTab';

export class WindowUserContextVisibilityHelper {
  private _tabsToHide: Tab[] = [];
  private _tabsToShow: Tab[] = [];
  private _hasIndexTab = false;
  private _isActive = false;

  public static async create(windowId: number, userContextId: Uint32.Uint32): Promise<WindowUserContextVisibilityHelper> {
    const browserWindow = await browser.windows.get(windowId, { populate: true });
    return new WindowUserContextVisibilityHelper(browserWindow, userContextId);
  }

  private constructor(browserWindow: browser.Windows.Window, userContextId: Uint32.Uint32) {
    if (!browserWindow.tabs) {
      throw new Error('browserWindow.tabs is undefined');
    }
    if (browserWindow.incognito) {
      throw new Error('browserWindow is incognito');
    }
    const tabs = browserWindow.tabs.map((browserTab) => new Tab(browserTab));
    for (const tab of tabs) {
      const userContextMatches = tab.originAttributes.userContextId === userContextId;
      if (userContextMatches && tab.active) {
        this._isActive = true;
      }
      if (IndexTab.isIndexTabUrl(tab.url)) {
        if (userContextMatches) {
          this._hasIndexTab = true;
        }
        continue;
      }
      if (tab.pinned ||!userContextMatches) {
        this._tabsToShow.push(tab);
      } else {
        this._tabsToHide.push(tab);
      }
    }
  }

  public get hasIndexTab(): boolean {
    return this._hasIndexTab;
  }

  public get tabsToHide(): ReadonlyArray<Tab> {
    return this._tabsToHide;
  }

  public get active(): boolean {
    return this._isActive;
  }

  public get tabToActivate(): Tab | undefined {
    if (this._tabsToShow.length < 1) {
      return undefined;
    }
    // return the most recently accessed tab
    return this._tabsToShow.reduce((a, b) => (a.lastAccessed > b.lastAccessed ? a : b));
  }
}
