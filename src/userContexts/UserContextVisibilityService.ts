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

import { config } from '../config/config';
import { Uint32 } from '../frameworks/types';
//import { OriginAttributes } from '../frameworks/tabGroups';
//import { TabGroup } from '../frameworks/tabGroups';

// 'never' -- do not show indices
// 'collapsed' -- show indices for collapsed containers
// 'always' -- always show indices
let configGroupIndexOption = 'never';
config['tab.groups.indexOption'].observe((value) => {
  configGroupIndexOption = value;
});

/**
 * This does not support private windows.
 */
export class UserContextVisibilityService {
  private static readonly INSTANCE = new UserContextVisibilityService();

  public static getInstance(): UserContextVisibilityService {
    return UserContextVisibilityService.INSTANCE;
  }

  private constructor() {
    // nothing.
    console.log('tab.groups.indexOption: ', configGroupIndexOption);
  }

  public async hideContainerOnWindow(windowId: number, userContextId: Uint32.Uint32): Promise<void> {
    // nothing.
    console.log('hideContainerOnWindow(): windowId=%d, userContextId=%d', windowId, userContextId);
  }

  public async showContainerOnWindow(windowId: number, userContextId: Uint32.Uint32): Promise<void> {
    // nothing.
    console.log('showContainerOnWindow(): windowId=%d, userContextId=%d', windowId, userContextId);
  }
}
