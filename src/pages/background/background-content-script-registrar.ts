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

import { CookieStoreService } from '../../lib/tabGroups/CookieStoreService';

import { LanguageSettings } from "../../lib/overrides/LanguageSettings";
import { config } from '../../config/config';

const languageSettings = LanguageSettings.getInstance();
let languageSettingsValues = new Map<string, string>();
const contentScripts = new Map<string, browser.ContentScripts.RegisteredContentScript>();
const cookieStoreService = CookieStoreService.getInstance();

const unregisterContentScript = async (key: string) => {
  await contentScripts.get(key)?.unregister();
  contentScripts.delete(key);
};

const unregisterAllContentScripts = async () => {
  const promises = [];
  for (const key of contentScripts.keys()) {
    promises.push(unregisterContentScript(key));
  }
  await Promise.all(promises);
};

let updating = false;
const update = async () => {
  if (updating) return;
  updating = true;
  try {
    const enabled = await config['feature.languageOverrides'].getValue();
    if (!enabled) {
      await unregisterAllContentScripts();
      return;
    }

    const cookieStores = await cookieStoreService.getCookieStores();
    const newValues = new Map<string, string>();
    for (const cookieStore of cookieStores) {
      const languages = await languageSettings.getValueForTabGroup(cookieStore.id);
      const cookieStoreId = cookieStore.id;
      if ('' === languages) continue;
      newValues.set(cookieStoreId, languages);
    }
    const promises = [];
    for (const key of contentScripts.keys()) {
      if (!newValues.has(key)) {
        promises.push(unregisterContentScript(key));
      }
    }
    await Promise.all(promises);

    for (const [key, languages] of newValues) {
      if (languageSettingsValues.has(key)) {
        if (languageSettingsValues.get(key) === languages) continue;

        await unregisterContentScript(key);
      }

      const cookieStoreId = key;
      const contentScript = await browser.contentScripts.register({
        js: [{
          code: `
            globalThis.gLanguageStore = globalThis.gLanguageStore ?? {};
            gLanguageStore.languages = ${JSON.stringify(languages)};
          `,
        }],
        matches: ['<all_urls>'],
        allFrames: true,
        matchAboutBlank: true,
        runAt: 'document_start',
        cookieStoreId,
      });
      // console.log(contentScript);
      contentScripts.set(key, contentScript);
    }

    languageSettingsValues = newValues;
  } finally {
    updating = false;
  }
};

config['feature.languageOverrides'].observe(update);
languageSettings.onChanged.addListener(update);
