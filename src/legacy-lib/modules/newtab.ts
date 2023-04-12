// vim: ts=2 sw=2 et ai
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

let newTabPage = 'about:newtab';
const privilegedNewTabPages: ReadonlySet<string> = new Set([
  'about:newtab',
  'about:home',
  'about:blank',
]);

browser.browserSettings.newTabPageOverride.get({}).then((details) => {
  if (!details) return;
  if (!details.value) return;
  newTabPage = details.value;
}).catch(e => console.error(e));

browser.browserSettings.newTabPageOverride.onChange.addListener((details) => {
  if (!details) return;
  if (!details.value) return;
  newTabPage = details.value;
});

export const isNewTabPage = (url: string) => url == newTabPage;
export const isPrivilegedNewTabPage = (url: string) => privilegedNewTabPages.has(url);
