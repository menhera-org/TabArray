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

export class WindowUserContextList {
  public static async create(windowId: number): Promise<WindowUserContextList> {
    const [browserWindow, userContexts] = await Promise.all([
      browser.windows.get(windowId, { populate: true }),
      UserContext.getAll(),
    ]);

    return new WindowUserContextList(browserWindow, userContexts);
  }

  private _openUserContexts: UserContext[] = [];
  private _inactiveUserContexts: UserContext[] = [];
  private _pinnedTabs: Tab[] = [];
  private _userContextTabMap: Map<Uint32.Uint32, Tab[]> = new Map();

  private constructor(browserWindow: browser.Windows.Window, userContexts: UserContext[]) {
    if (!browserWindow.tabs) {
      throw new Error('browserWindow.tabs is undefined');
    }
    const definedUserContextIds = new Map(userContexts.map((userContext) => [userContext.id, userContext]));
    const tabs = browserWindow.tabs.map((browserTab) => new Tab(browserTab));
    for (const tab of tabs) {
      if (tab.pinned) {
        this._pinnedTabs.push(tab);
        continue;
      }
      if (tab.originAttributes.userContextId == null) {
        continue;
      }
      this._openUserContexts.push(this._getUserContext(definedUserContextIds, tab.originAttributes.userContextId));
      const userContextTabs = this._userContextTabMap.get(tab.originAttributes.userContextId) ?? [];
      userContextTabs.push(tab);
      this._userContextTabMap.set(tab.originAttributes.userContextId, userContextTabs);
    }
    for (const userContext of userContexts) {
      if (this._openUserContexts.includes(userContext)) {
        continue;
      }
      this._inactiveUserContexts.push(userContext);
    }
  }

  private _getUserContext(definedUserContextIds: Map<Uint32.Uint32, UserContext>, userContextId: Uint32.Uint32): UserContext {
    if (definedUserContextIds.has(userContextId)) {
      const userContext = definedUserContextIds.get(userContextId);
      if (userContext == null) {
        throw new Error('userContext is null'); // This should never happen
      }
      return userContext;
    } else {
      const userContext = UserContext.createIncompleteUserContext(userContextId);
      return userContext;
    }
  }

  public getOpenUserContexts(): Iterable<UserContext> {
    return this._openUserContexts.values();
  }

  public getInactiveUserContexts(): Iterable<UserContext> {
    return this._inactiveUserContexts.values();
  }

  public getUserContextTabs(userContextId: Uint32.Uint32): Iterable<Tab> {
    return (this._userContextTabMap.get(userContextId) ?? []).values();
  }
}
