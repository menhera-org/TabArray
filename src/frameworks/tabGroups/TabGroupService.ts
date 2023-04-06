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

import { UserContext } from "./UserContext";
import { OriginAttributes } from "./OriginAttributes";
import { Uint32 } from "weeg-types";
import { TabGroup } from "./TabGroup";

export class TabGroupService {
  // static definitions.
  // This must be at the end of static definitions.
  private static readonly INSTANCE = new TabGroupService();

  public static getInstance(): TabGroupService {
    return TabGroupService.INSTANCE;
  }

  private constructor() {
    // Do nothing.
  }

  public async getTabGroupFromUserContextId(aUserContextId: Uint32.Uint32): Promise<TabGroup> {
    const userContext = UserContext.createIncompleteUserContext(aUserContextId);
    const tabGroup = await userContext.getTabGroup();
    return tabGroup;
  }

  public async getPrivateBrowsingTabGroup(): Promise<TabGroup> {
    const originAttributes = new OriginAttributes(undefined, 0 as Uint32.Uint32, 1 as Uint32.Uint32);
    const tabGroup = await TabGroup.createTabGroup(originAttributes);
    return tabGroup;
  }
}
