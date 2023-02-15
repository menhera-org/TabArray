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
import { UserContext } from '../tabGroups';
import { Tab } from './Tab';

export type ActiveTabsByWindow = Map<number, {tab: Tab, userContext: UserContext, isPrivate: boolean}>;

export class WindowService {
  private static readonly INSTANCE = new WindowService();

  public static getInstance(): WindowService {
    return WindowService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public async getActiveTabsByWindow(): Promise<ActiveTabsByWindow> {
    const browserTabs = await browser.tabs.query({ active: true });
    const activeTabs: ActiveTabsByWindow = new Map();
    for (const browserTab of browserTabs) {
      const tab = new Tab(browserTab);
      if (null == tab.originAttributes.userContextId) {
        continue;
      }
      // return "No Container" for private browsing.
      const userContext = await UserContext.get(tab.originAttributes.userContextId);
      const isPrivate = await this.isPrivateWindow(tab.windowId);
      activeTabs.set(tab.windowId, { tab, userContext, isPrivate });
    }
    return activeTabs;
  }

  public async isPrivateWindow(windowId: number): Promise<boolean> {
    const browserWindow = await browser.windows.get(windowId);
    return browserWindow.incognito;
  }
}
