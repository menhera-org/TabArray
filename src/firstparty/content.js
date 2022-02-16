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

/*
  Original code published for _Site-based Tabs_ at https://github.com/menhera-org/tab-policy (2021)
*/

const getCookieKeys = () => document.cookie.split('; ').map(cookie => cookie.split('=')[0]);

/**
 * 
 * @param {number} aByteLength 
 * @returns {string}
 */
const getRandomHex = (aByteLength) => {
  const byteLength = aByteLength & (-1 >>> 1);
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.prototype.map.call(bytes, byte => (0x100 | byte).toString(0x10).slice(-2)).join('');
};

const getRandomCookieKey = () => `_menhera_${getRandomHex(16)}`;

const isDomainName = (hostname) => !String(hostname).match(/^[0-9]+(\.[0-9]+)*$/) && !String(hostname).startsWith('[');

const reportRegistrableDomain = (domain) => void browser.runtime.sendMessage({command: 'registrable_domain', domain: String(domain)});

if (isDomainName(location.hostname)) {
  const domainLabels = location.hostname.split('.');
  if (domainLabels.length > 1) {
    for (let i = 2; i <= domainLabels.length; i++) {
      const domain = domainLabels.slice(- i).join('.');
      const key = getRandomCookieKey();
      document.cookie = `${key}=1;domain=${domain}`;
      const keys = getCookieKeys();
      if (keys.includes(key)) {
        // cookie set, remove now
        document.cookie = `${key}=;domain=${domain};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        reportRegistrableDomain(domain);
        break;
      }
    }
  }
}

