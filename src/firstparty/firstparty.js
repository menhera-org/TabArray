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
import { toCookieStoreId } from "../modules/containers.js";
import { FirstPartyService } from './FirstPartyService';
import { dns } from '../frameworks/index';

// This file is to be loaded only by background.js.

const { HostnameService } = dns;
const hostnameService = HostnameService.getInstance();
const firstPartyService = FirstPartyService.getInstance();

globalThis.FirstpartyManager = {};

FirstpartyManager.getRegistrableDomain = (aDomain) =>
{
  return firstPartyService.getRegistrableDomain(new URL(`http://${aDomain}/`));
};

FirstpartyManager.getAll = async () => {
  const tabs = await browser.tabs.query({
    windowType: 'normal',
  });
  const sites = new Map;
  for (const tabObj of tabs) {
    try {
      const url = new URL(tabObj.url);
      if (url.protocol != 'http:' && url.protocol != 'https:') {
        continue;
      }
      const hostname = url.hostname;
      if (hostnameService.isHostnameIpAddress(hostname)) {
        continue;
      }
      const registrableDomain = FirstpartyManager.getRegistrableDomain(hostname);
      if (!sites.has(registrableDomain)) {
        sites.set(registrableDomain, {tabCount: 0});
      }
      const site = sites.get(registrableDomain);
      site.tabCount += 1;
      if (!!tabObj.title) {
        site.title = tabObj.title;
      }
      if (!!tabObj.favIconUrl) {
        site.icon = tabObj.favIconUrl;
      }
    } catch (e) {
      continue;
    }
  }
  const result = {};
  const registrableDomains = [... sites.keys()];
  registrableDomains.sort();
  for (const registrableDomain of registrableDomains) {
    if (!registrableDomain) {
      result[''] = sites.get(registrableDomain);
    } else {
      result[registrableDomain] = sites.get(registrableDomain);
    }
  }
  return result;
};

FirstpartyManager.closeAllByContainer = async (aRegistrableDomain, aUserContextId) => {
  const registrableDomain = aRegistrableDomain || '';
  const cookieStoreId = toCookieStoreId(aUserContextId);
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
      const {hostname} = url;
      const tabRegistrableDomain = FirstpartyManager.getRegistrableDomain(hostname) || '';
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

FirstpartyManager.clearData = async () => {
  // NOOP. This is for compatibility with the old implementation.
};
