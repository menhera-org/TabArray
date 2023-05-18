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

import { ExtensionPageService } from "../../lib/ExtensionPageService";
import { ActiveContainerService } from "../../lib/states/ActiveContainerService";

const extensionPageService = ExtensionPageService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();

export interface LoadingTabDetails {
  windowId: number;
}

const _loadingTabs = new Map<number, CompatTab>();

export const loadingTabs = {
  add(tab: CompatTab) {
    const tabId = tab.id;
    _loadingTabs.set(tabId, tab);
  },

  notifyLoadFinished(tab: CompatTab) {
    const tabId = tab.id;
    if (!_loadingTabs.has(tabId)) {
      return;
    }
    _loadingTabs.delete(tabId);
    if (extensionPageService.isConfirmPage(tab.url)) {
      return;
    }
    if (tab.cookieStore.isPrivate) {
      return;
    }
    if (!tab.active) {
      return;
    }
    activeContainerService.setActiveContainer(tab.windowId, tab.cookieStore.id).catch((e) => {
      console.error(e);
    });
  },

  notifyTabDisappeared(tabId: number) {
    _loadingTabs.delete(tabId);
  },

  isLoading(tabId: number) {
    return _loadingTabs.has(tabId);
  },
};
