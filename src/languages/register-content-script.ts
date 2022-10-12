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
import { LanguageSettings } from "./LanguageSettings";
import { CookieStoreSet } from '../frameworks/tabGroups';
import { OriginAttributes } from '../frameworks/tabGroups';

const languageSettings = LanguageSettings.getInstance();
let languageSettingsValues = new Map<string, string>();
const contentScripts = new Map<string, browser.ContentScripts.RegisteredContentScript>();
const cookieStoreSet = new CookieStoreSet();

const unregisterContentScript = (key: string) => {
  contentScripts.get(key)?.unregister();
  contentScripts.delete(key);
};

languageSettings.onChanged.addListener(async () => {
  const cookieStores = await cookieStoreSet.getAll();
  const newValues = new Map<string, string>();
  for (const originAttributes of cookieStores) {
    const languages = languageSettings.getLanguages(originAttributes);
    const originAttributesString = originAttributes.toString();
    if ('' === languages) continue;
    newValues.set(originAttributesString, languages);
  }
  for (const key of contentScripts.keys()) {
    if (!newValues.has(key)) {
      unregisterContentScript(key);
    }
  }

  for (const [key, languages] of newValues) {
    if (languageSettingsValues.has(key)) {
      if (languageSettingsValues.get(key) === languages) continue;

      unregisterContentScript(key);
    }

    const cookieStoreId = OriginAttributes.fromString(key).cookieStoreId;
    const contentScript = await browser.contentScripts.register({
      js: [{
        code: `
          globalThis.gLanguageStore = globalThis.gLanguageStore ?? {};
          gLanguageStore.languages = ${JSON.stringify(languages)};
        `,
      }],
      matches: ['<all_urls>'],
      allFrames: true,
      runAt: 'document_start',
      cookieStoreId,
    });
    console.log(contentScript);
    contentScripts.set(key, contentScript);
  }

  languageSettingsValues = newValues;

  const browserTabs = await browser.tabs.query({});
  for (const browserTab of browserTabs) {
    if (!browserTab.cookieStoreId || null == browserTab.id) continue;
    const originAttributes = OriginAttributes.fromCookieStoreId(browserTab.cookieStoreId);
    const languages = languageSettings.getLanguages(originAttributes);
    if ('' === languages) continue;

    browser.tabs.sendMessage(browserTab.id, {
      type: 'language-changed',
      languages,
    }).catch(() => {
      // ignore.
    });
  }
});
