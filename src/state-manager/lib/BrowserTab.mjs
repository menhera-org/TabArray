// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

// BrowserTab
const CLASS_ID = 'ac14db90-8a54-41f5-b080-0cc73dd5a937';

export class BrowserTab extends LifecycleEventTarget {
  constructor(id) {
    super();
    this.id = 0|id;
    this.userContextId = 0;
    this.windowId = 0;
    this.url = '';
    this.closed = false;
    this.favIconUrl = '';
    this.initialized = false;
    this.discarded = false;
    this.active = false;
    this.index = 0;
    this.pinned = false;
    this.hidden = false;
    this.previewUrl = '';
    this.title = '';
  }

  async close() {
    if (this.closed) {
      return;
    }
    await browser.tabs.remove(this.id);
  }
}
