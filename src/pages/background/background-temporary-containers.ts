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

import browser from 'webextension-polyfill';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TemporaryContainerService } from '../../lib/tabGroups/TemporaryContainerService';

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const temporatyContainerService = TemporaryContainerService.getInstance();

contextualIdentityFactory.onRemoved.addListener(async (identity) => {
  temporatyContainerService.removeTemporaryContainerFromList(identity.cookieStore.id);
});

browser.tabs.onRemoved.addListener(async () => {
  try {
    const identities = await contextualIdentityFactory.getAll();
    const cookieStoreIds = new Set(identities.map((identity) => identity.cookieStore.id));
    const browserTabs = await browser.tabs.query({});
    for (const browserTab of browserTabs) {
      if (!browserTab.cookieStoreId) {
        continue;
      }
      cookieStoreIds.delete(browserTab.cookieStoreId);
    }

    const promises: Promise<void>[] = [];
    for (const cookieStoreId of cookieStoreIds) {
      if (!await temporatyContainerService.isTemporaryContainer(cookieStoreId)) {
        continue;
      }

      promises.push(temporatyContainerService.removeTemporaryContainer(cookieStoreId));
    }

    await Promise.all(promises);
  } catch (e) {
    console.warn(e);
  }
});
