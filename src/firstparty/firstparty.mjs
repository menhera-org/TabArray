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

// This file is to be loaded only by background.mjs.

const CONTENT_SCRIPT = '/firstparty/content.js';

const registrableDomains = new Set([
  'mozilla.org', // because addons cannot access addons.mozilla.org
]);

globalThis.FirstpartyManager = {};

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
      const hostname = url.hostname;
      if (!FirstpartyManager.isDomainName(hostname)) {
        continue;
      }
      const registrableDomain = FirstpartyManager.getRegistrableDomain(hostname);
      if (!sites.has(registrableDomain)) {
        sites.set(registrableDomain, {});
      }
      const site = sites.get(registrableDomain);
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
    if (!registrableDomains.has(domain)) {
      console.log('registrable domain:', domain);
    }
    registrableDomains.add(domain);
  }
});
