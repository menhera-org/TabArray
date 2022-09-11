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
import { Uint32 } from '../types';
import { Tab } from '../tabs';
import { UserContext } from './UserContext';
import { DefinedUserContextList } from './DefinedUserContextList';

export class WindowUserContextList {
  public static async create(windowId: number): Promise<WindowUserContextList> {
    const browserWindow = await browser.windows.get(windowId, { populate: true });
    const definedUserContexts = await DefinedUserContextList.create(browserWindow.incognito);

    return new WindowUserContextList(browserWindow, definedUserContexts);
  }

  private _openUserContexts = new Map<Uint32.Uint32, UserContext>();
  private _inactiveUserContexts: UserContext[] = [];
  private _pinnedTabs: Tab[] = [];
  private _userContextTabMap: Map<Uint32.Uint32, Tab[]> = new Map();
  private _isPrivate = false;
  private _windowId: number;

  private constructor(browserWindow: browser.Windows.Window, userContexts: DefinedUserContextList) {
    if (!browserWindow.tabs) {
      throw new Error('browserWindow.tabs is undefined');
    }
    if (browserWindow.incognito) {
      this._isPrivate = true;
    }
    this._windowId = browserWindow.id ?? browser.windows.WINDOW_ID_NONE;
    const tabs = browserWindow.tabs.map((browserTab) => new Tab(browserTab));
    for (const tab of tabs) {
      if (tab.pinned) {
        this._pinnedTabs.push(tab);
        continue;
      }
      if (tab.originAttributes.userContextId == null) {
        continue;
      }
      this._openUserContexts.set(tab.originAttributes.userContextId, userContexts.getUserContext(tab.originAttributes.userContextId));
      const userContextTabs = this._userContextTabMap.get(tab.originAttributes.userContextId) ?? [];
      userContextTabs.push(tab);
      this._userContextTabMap.set(tab.originAttributes.userContextId, userContextTabs);
    }
    this._addInactiveUserContexts(userContexts);
  }

  private _addInactiveUserContexts(userContexts: DefinedUserContextList): void {
    for (const userContextId of userContexts.getDefinedUserContextIds()) {
      const userContext = userContexts.getUserContext(userContextId);
      if (this._openUserContexts.has(userContext.id)) {
        continue;
      }
      this._inactiveUserContexts.push(userContext);
    }
  }

  public getOpenUserContexts(): Iterable<UserContext> {
    return this._openUserContexts.values();
  }

  public getInactiveUserContexts(): Iterable<UserContext> {
    return this._inactiveUserContexts.values();
  }

  public getUserContextTabs(userContextId: Uint32.Uint32): Iterable<Tab> {
    const tabs = [... (this._userContextTabMap.get(userContextId) ?? [])];
    tabs.sort((a, b) => a.index - b.index);
    return tabs.values();
  }

  public getPinnedTabs(): Iterable<Tab> {
    const tabs = [... this._pinnedTabs];
    tabs.sort((a, b) => a.index - b.index);
    return tabs.values();
  }

  public get isPrivate(): boolean {
    return this._isPrivate;
  }

  public get windowId(): number {
    return this._windowId;
  }
}
