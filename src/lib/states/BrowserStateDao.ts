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

import { TabDao } from "./TabDao";
import { TagType } from "../tabGroups/tags/TagDirectory";
import { DisplayedContainerDao } from "./DisplayedContainerDao";
import { SupergroupStorageType } from "../tabGroups/TabGroupDirectory";
import { WindowStateDao } from "./WindowStateDao";

export interface BrowserStateDao {
  currentWindowId: number;
  enabledInPrivateBrowsing: boolean;
  windowIds: number[];
  displayedContainers: DisplayedContainerDao[];
  tags: {
    [tagId: number]: TagType;
  };
  tagIdsForTabs: {
    [tabId: number]: number; // tagId
  };
  supergroups: SupergroupStorageType; // can be used in constructor of TabGroupDirectorySnapshot
  tabIdsByContainer: {
    [cookieStoreId: string]: number[]; // tabIds
  };
  tabIdsBySite: {
    [domain: string]: number[]; // tabIds
  };

  /**
   * This is unsorted.
   */
  tabs: {
    [tabId: number]: TabDao;
  };

  /**
   * This is unsorted.
   */
  windows: {
    [windowId: number]: WindowStateDao;
  };
}
