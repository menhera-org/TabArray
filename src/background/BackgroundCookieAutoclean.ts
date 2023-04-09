// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { ContextualIdentityService } from '../lib/tabGroups/ContextualIdentityService';
import { TabGroupService } from '../lib/tabGroups/TabGroupService';

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const tabGroupService = TabGroupService.getInstance();

browser.tabs.onRemoved.addListener(async (/*tabId, removeInfo*/) => {
  const [contextualIdentities, openTabGroupIds, autoCleanEnabledTabGroupIds] = await Promise.all([
    contextualIdentityFactory.getAll(),
    tabGroupService.getOpenTabGroupIds(),
    tabGroupService.optionDirectory.getAutocleanEnabledTabGroupIds(),
  ]);
  const promises: Promise<void>[] = [];
  for (const contextualIdentity of contextualIdentities) {
    const cookieStoreId = contextualIdentity.cookieStore.id;
    if (!openTabGroupIds.includes(cookieStoreId) && autoCleanEnabledTabGroupIds.includes(cookieStoreId)) {
      console.info('Removing browsing data for tab group', cookieStoreId, contextualIdentity.name);
      promises.push(tabGroupService.removeBrowsingDataForTabGroupId(cookieStoreId));
    }
  }
  await Promise.all(promises);
});
