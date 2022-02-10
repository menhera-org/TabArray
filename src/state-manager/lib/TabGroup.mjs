// vim: ts=2 sw=2 et ai
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

import { LifecycleEventTarget } from "./LifecycleEventTarget.mjs";

const CLASS_ID = '2675782A-2B71-47D2-9A6B-6A374F421FE2';


export class TabGroup extends LifecycleEventTarget {
  constructor(userContextId, windowId) {
    super();
    this.userContextId = 0|userContextId;
    this.windowId = 0|windowId;
    this.tabIds = new Set;
    this._startIndex = 0;
    this.stateManager = null;
  }

  get CLASS_ID() {
    return CLASS_ID;
  }
}
