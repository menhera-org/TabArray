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
import { EventSink } from "weeg-events";

import { TabGroupDirectory } from "./TabGroupDirectory";
import { TagDirectory } from "./tags/TagDirectory";
import { TabAttributeMap } from "./tags/TabAttributeMap";
import { IndexTab } from "../../legacy-lib/modules/IndexTab";

export class TabSortingProvider {
  private static readonly tabGroupDirectory = new TabGroupDirectory();
  private static readonly tagDirectory = new TagDirectory();

  public readonly onChanged = new EventSink<void>();

  public constructor() {
    TabSortingProvider.tabGroupDirectory.onChanged.addListener(() => {
      this.onChanged.dispatch();
    });
    TabSortingProvider.tagDirectory.onChanged.addListener(() => {
      this.onChanged.dispatch();
    });
  }

  public async getTabSortingOrder(tabs: Iterable<CompatTab>): Promise<CompatTab[]> {
    const tabArray = Array.from(tabs);
    const [tabGroupDirectorySnapshot, tabAttributeMap] = await Promise.all([
      TabSortingProvider.tabGroupDirectory.getSnapshot(),
      TabAttributeMap.create(tabArray),
    ]);
    const tabGroupIds = tabGroupDirectorySnapshot.getContainerOrder();
    tabArray.sort((a, b) => {
      const aIndex = tabGroupIds.indexOf(a.cookieStore.id);
      const bIndex = tabGroupIds.indexOf(b.cookieStore.id);
      if (aIndex != bIndex) {
        if (aIndex == -1) return 1;
        if (bIndex == -1) return -1;
      } else {
        if (IndexTab.isIndexTabUrl(a.url)) {
          return -1;
        }
        if (IndexTab.isIndexTabUrl(b.url)) {
          return 1;
        }
        const aTagId = tabAttributeMap.getTagForTab(a.id)?.tagId ?? 0;
        const bTagId = tabAttributeMap.getTagForTab(b.id)?.tagId ?? 0;
        if (aTagId != bTagId) {
          return aTagId - bTagId;
        }
      }
      return aIndex - bIndex;
    });
    return tabArray;
  }
}
