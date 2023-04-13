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

import { Uint32 } from "weeg-types";

import { UserContext } from "./UserContext";

export class DefinedUserContextList {
  public static async create(isPrivateBrowsing: boolean): Promise<DefinedUserContextList> {
    const userContexts = isPrivateBrowsing ? [UserContext.DEFAULT] : await UserContext.getAll();

    const map = new Map<Uint32.Uint32, UserContext>();
    for (const userContext of userContexts) {
      map.set(userContext.id, userContext);
    }
    return new DefinedUserContextList(map);
  }

  private readonly _definedUserContextMap: ReadonlyMap<Uint32.Uint32, UserContext>;

  private constructor(definedUserContextMap: ReadonlyMap<Uint32.Uint32, UserContext>) {
    this._definedUserContextMap = definedUserContextMap;
  }

  public getDefinedUserContextIds(): Uint32.Uint32[] {
    // TODO: implement sorting
    return Array.from(this._definedUserContextMap.keys());
  }

  public getUserContext(userContextId: Uint32.Uint32): UserContext {
    if (this._definedUserContextMap.has(userContextId)) {
      const userContext = this._definedUserContextMap.get(userContextId);
      if (userContext == null) {
        throw new Error('userContext is null'); // This should never happen
      }
      return userContext;
    }
    return UserContext.createIncompleteUserContext(userContextId);
  }
}
