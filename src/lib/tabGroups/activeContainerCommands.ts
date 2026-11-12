/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import browser from 'webextension-polyfill';
import { CookieStore } from 'weeg-containers';

import { ContainerVisibilityService } from './ContainerVisibilityService';
import { NativeTabGroupService } from './NativeTabGroupService';

/**
 * Collapses or expands the container of the active tab in the current window (#486).
 * As tab groups, its group collapses and the active tab stays in view; otherwise the container
 * is hidden as from the popup, which moves to another tab.
 */
export const setActiveContainerCollapsed = async (collapsed: boolean): Promise<void> => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.pinned || tab.incognito || tab.cookieStoreId == null || tab.windowId == null) return;
  if (tab.cookieStoreId == CookieStore.DEFAULT.id) return; // tabs with no container are not grouped
  const { windowId, cookieStoreId } = tab;
  const nativeTabGroupService = NativeTabGroupService.getInstance();
  if (await nativeTabGroupService.isActive()) {
    await nativeTabGroupService.setContainerCollapsed(windowId, cookieStoreId, collapsed);
    return;
  }
  const containerVisibilityService = ContainerVisibilityService.getInstance();
  if (collapsed) {
    await containerVisibilityService.hideContainerOnWindow(windowId, cookieStoreId);
  } else {
    await containerVisibilityService.showContainerOnWindow(windowId, cookieStoreId);
  }
};
