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

import browser from 'webextension-polyfill';
import { UserContext } from '../frameworks/tabGroups';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';

const MENU_ID_TAB_HIDE_CONTAINER = 'tab-hide-container';

const userContextVisibilityService = UserContextVisibilityService.getInstance();

browser.menus.create({
  id: MENU_ID_TAB_HIDE_CONTAINER,
  title: browser.i18n.getMessage('contextMenuHideSelectedContainer'),
  contexts: ['tab'],
});

browser.menus.onClicked.addListener((info, tab) => {
  if (tab == null) return;
  if (tab.cookieStoreId == null) return;

  if (info.menuItemId == MENU_ID_TAB_HIDE_CONTAINER) {
    if (UserContext.isCookieStoreIdPrivateBrowsing(tab.cookieStoreId)) {
      return;
    }

    const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
    if (tab.windowId == null) {
      return;
    }
    userContextVisibilityService.hideContainerOnWindow(tab.windowId, userContextId).catch(e => console.error(e));
  }
});
