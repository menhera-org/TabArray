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
import { ContextualIdentity } from 'weeg-containers';

import { TabQueryService } from '../lib/tabs/TabQueryService';
import { TabService } from '../lib/tabs/TabService';
import { CompatConsole } from '../lib/console/CompatConsole';

const tabQueryService = TabQueryService.getInstance();
const tabService = TabService.getInstance();
const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

browser.contextualIdentities.onRemoved.addListener(async ({contextualIdentity: browserContextualIdentity}) => {
  try {
    const contextualIdentity = ContextualIdentity.fromWebExtensionsContextualIdentity(browserContextualIdentity);
    const cookieStoreId = contextualIdentity.cookieStore.id;
    const name = contextualIdentity.name;
    console.info('contextualIdentity %s (%s) removed', name, cookieStoreId);
    const tabs = await tabQueryService.queryTabs({
      tabGroupId: cookieStoreId,
    });
    if (tabs.length > 0) {
      await tabService.closeTabs(tabs);
      console.info('closed %d tabs in %s (%s)', tabs.length, name, cookieStoreId);
    }
  } catch (e) {
    console.error(e);
  }
});
