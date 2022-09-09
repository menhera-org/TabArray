// vim: set ts=2 et ai :
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
import { FirstPartyService } from '../frameworks/tabGroups/FirstPartyService';
import { UserContext } from '../frameworks/tabGroups';

// This file is to be loaded only by background.js.

const firstPartyService = FirstPartyService.getInstance();

globalThis.FirstpartyManager = {};

FirstpartyManager.closeAllByContainer = async (aRegistrableDomain, aUserContextId) => {
  const registrableDomain = aRegistrableDomain || '';
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const tabs = await browser.tabs.query({
    cookieStoreId,
    windowType: 'normal',
		url: ['*://*/*'], // HTTP and HTTPS
  });
  const tabIdsClosed = [];
  for (const tabObj of tabs) {
    try {
      const url = new URL(tabObj.url); // this should not throw
      if (url.protocol != 'http:' && url.protocol != 'https:') {
        console.warn('This should not happen');
        continue;
      }
      const tabRegistrableDomain = firstPartyService.getRegistrableDomain(url);
      if (registrableDomain != tabRegistrableDomain) {
        continue;
      }
      tabIdsClosed.push(tabObj.id);
    } catch (e) {
      console.error('This should not happen!', e);
    }
  }
  await browser.tabs.remove(tabIdsClosed);
};
