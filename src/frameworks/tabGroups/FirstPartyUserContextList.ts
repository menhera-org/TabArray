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

import { Tab } from "../tabs";
import { Uint32 } from "../types";
import { DefinedUserContextList } from "./DefinedUserContextList";
import { OriginAttributes } from "./OriginAttributes";
import { TabGroup } from "./TabGroup";
import { UserContext } from "./UserContext";

export class FirstPartyUserContextList {
  public static async create(firstPartyDomain: string, isPrivateBrowsing = false): Promise<FirstPartyUserContextList> {
    const originAttributes = new OriginAttributes(firstPartyDomain, undefined, (isPrivateBrowsing ? 1 : 0) as Uint32.Uint32);
    const [tabGroup, userContexts] = await Promise.all([
      TabGroup.createTabGroup(originAttributes),
      DefinedUserContextList.create(isPrivateBrowsing),
    ]);
    const tabs = await tabGroup.tabList.getTabs();
    return new FirstPartyUserContextList(firstPartyDomain, tabs, userContexts, isPrivateBrowsing);
  }

  private readonly _firstPartyDomain: string;
  private readonly _tabs: Tab[];
  private readonly _definedUserContexts: DefinedUserContextList;
  private readonly _openUserContexts = new Map<Uint32.Uint32, UserContext>;
  private _userContextTabMap: Map<Uint32.Uint32, Tab[]> = new Map();
  private _isPrivateBrowsing: boolean;

  private constructor(firstPartyDomain: string, tabs: Tab[], definedUserContexts: DefinedUserContextList, isPrivateBrowsing: boolean) {
    this._firstPartyDomain = firstPartyDomain;
    this._tabs = tabs;
    this._definedUserContexts = definedUserContexts;
    this._isPrivateBrowsing = isPrivateBrowsing;
    for (const tab of tabs) {
      const userContextId = tab.originAttributes.userContextId;
      if (userContextId == null) {
        continue;
      }
      const userContext = this._definedUserContexts.getUserContext(userContextId);
      this._openUserContexts.set(userContextId, userContext);
      const userContextTabs = this._userContextTabMap.get(userContextId) ?? [];
      userContextTabs.push(tab);
      this._userContextTabMap.set(userContextId, userContextTabs);
    }
  }

  public get firstPartyDomain(): string {
    return this._firstPartyDomain;
  }

  public getOpenUserContexts(): Iterable<UserContext> {
    return this._openUserContexts.values();
  }

  public getUserContextTabs(userContextId: Uint32.Uint32): Iterable<Tab> {
    const tabs = [... (this._userContextTabMap.get(userContextId) ?? [])];
    tabs.sort((a, b) => {
      let sortOrder = a.windowId - b.windowId;
      if (sortOrder === 0) {
        sortOrder = a.index - b.index;
      }
      return sortOrder;
    });
    return tabs.values();
  }

  public get isPrivate(): boolean {
    return this._isPrivateBrowsing;
  }
}
