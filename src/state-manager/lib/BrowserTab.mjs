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

// BrowserTab
const CLASS_ID = 'ac14db90-8a54-41f5-b080-0cc73dd5a937';

export class BrowserTab extends EventTarget {
  id = 0;
  userContextId = 0;
  windowId = 0;
  url = '';
  closed = false;
  favIconUrl = '';
  initialized = false;
  discarded = false;
  active = false;
  index = 0;
  pinned = false;
  hidden = false;
  previewUrl = '';
  title = '';

  constructor(id) {
    super();
    this.id = 0|id;
  }

  async close() {
    //
  }
}
