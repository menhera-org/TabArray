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

import { CompatTab } from "weeg-tabs";
import { CookieStore } from "weeg-containers";

/**
 * Tab data object. When you pass it to a renderer, you should mark it as `Readonly<TabDao>`.
 */
export interface TabDao {
  id: number;
  url: string;
  title: string;
  favIconUrl: string;
  windowId: number;
  discarded: boolean;
  hidden: boolean;
  active: boolean;
  pinned: boolean;
  index: number;
  isSharing: boolean;
  lastAccessed: number;
  muted: boolean;
  audible: boolean;

  cookieStoreId: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TabDao {
  export function fromCompatTab(compatTab: CompatTab): TabDao {
    return {
      id: compatTab.id,
      url: compatTab.url,
      title: compatTab.title,
      favIconUrl: compatTab.favIconUrl,
      windowId: compatTab.windowId,
      discarded: compatTab.discarded,
      hidden: compatTab.hidden,
      active: compatTab.active,
      pinned: compatTab.pinned,
      index: compatTab.index,
      isSharing: compatTab.isSharing,
      lastAccessed: compatTab.lastAccessed,
      muted: compatTab.muted,
      audible: compatTab.audible,
      cookieStoreId: compatTab.cookieStore.id,
    };
  }

  export function toCompatTab(dao: TabDao): CompatTab {
    const compatTab: CompatTab = {
      id: dao.id,
      url: dao.url,
      title: dao.title,
      favIconUrl: dao.favIconUrl,
      windowId: dao.windowId,
      discarded: dao.discarded,
      hidden: dao.hidden,
      active: dao.active,
      pinned: dao.pinned,
      index: dao.index,
      isSharing: dao.isSharing,
      lastAccessed: dao.lastAccessed,
      muted: dao.muted,
      audible: dao.audible,
      cookieStore: new CookieStore(dao.cookieStoreId),
    } as CompatTab;
    Object.setPrototypeOf(compatTab, CompatTab.prototype);
    return compatTab;
  }
}
