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

import { toCookieStoreId } from "../modules/containers.js";

// This file is to be loaded only by background.js.

const CONTENT_SCRIPT = '/firstparty/content.js';

const STORAGE_MAX_ENTRIES = 1000;
const STORAGE_KEY = 'firstparty.domains';

let registrableDomains = new Set([
  'mozilla.org', // because addons cannot access addons.mozilla.org
]);

globalThis.FirstpartyManager = {};

browser.storage.local.get(STORAGE_KEY).then((values) => {
  if (!values) {
    return;
  }
  if (!Array.isArray(values[STORAGE_KEY])) {
    return;
  }
  const domains = values[STORAGE_KEY].filter((domain) => (
    'string' == typeof domain && !registrableDomains.has(domain)
  ));
  console.log('%d registrable domain(s) imported from storage', domains.length);
  domains.push(... registrableDomains);
  registrableDomains = new Set(domains);
});

FirstpartyManager.saveData = async () => {
  const data = [...registrableDomains].slice(- STORAGE_MAX_ENTRIES);
  await browser.storage.local.set({
    [STORAGE_KEY]: data,
  });
}

FirstpartyManager.getRegistrableDomain = (aDomain) =>
{
	if (!aDomain) return null;
	const domain = String(aDomain);
	const parts = domain.split('.');
	if (parts.length < 2) return domain;
	for (let i = 2; i <= parts.length; i++) {
		const domain = parts.slice(- i).join('.');
		if (registrableDomains.has(domain)) return domain;
	}
	return domain;
};

FirstpartyManager.isDomainName = (hostname) => !String(hostname).match(/^[0-9]+(\.[0-9]+)*$/) && !String(hostname).startsWith('[');

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
      if (!FirstpartyManager.isDomainName(hostname)) {
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
  registrableDomains.clear();
  await FirstpartyManager.saveData();
};

browser.contentScripts.register({
  matches: ['*://*/*'], // all HTTP/HTTPS page
  js: [
    {file: CONTENT_SCRIPT},
  ],
}).then((_reg) => {
  console.log('Content script registered');
}).catch((e) => {
  console.error(e);
});

browser.runtime.onMessage.addListener((message) => {
  if (message.command == 'registrable_domain') {
    const {domain} = message;
    if ('string' != typeof domain) {
      return;
    }
    if (!registrableDomains.has(domain)) {
      console.log('registrable domain:', domain);
      registrableDomains.add(domain);
    } else {
      // make the item last
      registrableDomains.delete(domain);
      registrableDomains.add(domain);
    }
    FirstpartyManager.saveData().catch((e) => {
      console.error('Error saving domains data', e);
    });
  }
});
