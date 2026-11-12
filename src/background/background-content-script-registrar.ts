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

/*
  Per-container overrides reach pages through content scripts registered for each container,
  with the values written into the code, so pages see them before their first script runs.
*/

import browser from 'webextension-polyfill';

import { CookieStoreService } from '../lib/tabGroups/CookieStoreService';

import { LanguageSettings } from '../lib/overrides/LanguageSettings';
import { UserAgentSettings } from '../lib/overrides/UserAgentSettings';
import { config } from '../config/config';

const languageSettings = LanguageSettings.getInstance();
const userAgentSettings = UserAgentSettings.getInstance();
const cookieStoreService = CookieStoreService.getInstance();

const contentScripts = new Map<string, { code: string; script: browser.ContentScripts.RegisteredContentScript }>();

/** The code that hands a container's overrides to content/overrides/content.ts, whichever runs first. */
const getCode = async (cookieStoreId: string, languagesEnabled: boolean, userAgentEnabled: boolean) => {
  const lines: string[] = [];
  const languages = languagesEnabled ? await languageSettings.getValueForTabGroup(cookieStoreId) : '';
  if ('' !== languages) {
    lines.push(
      'globalThis.gLanguageStore = globalThis.gLanguageStore ?? {};',
      `gLanguageStore.languages = ${JSON.stringify(languages)};`
    );
  }
  // Pages served by a service worker do not take the user agent from the request header (#396).
  const userAgent = userAgentEnabled ? await userAgentSettings.getUserAgent(cookieStoreId) : '';
  if ('' !== userAgent) {
    lines.push(
      `globalThis.gUserAgentOverride = ${JSON.stringify(userAgent)};`,
      'globalThis.gApplyUserAgentOverride?.();'
    );
  }
  return lines.join('\n');
};

const doUpdate = async () => {
  const [languagesEnabled, userAgentEnabled, cookieStores] = await Promise.all([
    config['feature.languageOverrides'].getValue(),
    config['feature.uaOverrides'].getValue(),
    cookieStoreService.getCookieStores(),
  ]);
  const wanted = new Map<string, string>();
  for (const cookieStore of cookieStores) {
    const code = await getCode(cookieStore.id, languagesEnabled, userAgentEnabled);
    if ('' !== code) wanted.set(cookieStore.id, code);
  }

  for (const [cookieStoreId, { code, script }] of contentScripts) {
    if (wanted.get(cookieStoreId) === code) continue;
    contentScripts.delete(cookieStoreId);
    await script.unregister();
  }

  for (const [cookieStoreId, code] of wanted) {
    if (contentScripts.has(cookieStoreId)) continue;
    const script = await browser.contentScripts.register({
      js: [{ code }],
      matches: ['<all_urls>'],
      allFrames: true,
      matchAboutBlank: true,
      runAt: 'document_start',
      cookieStoreId,
    });
    contentScripts.set(cookieStoreId, { code, script });
  }
};

let running = false;
let rerun = false;
/** Runs one update at a time; a change during an update runs another one after it. */
const update = () => {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  (async () => {
    do {
      rerun = false;
      await doUpdate();
    } while (rerun);
  })()
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      running = false;
    });
};

config['feature.languageOverrides'].observe(update);
config['feature.uaOverrides'].observe(update);
languageSettings.onChanged.addListener(update);
userAgentSettings.onChanged.addListener(update);
// The Chrome preset follows the current Chrome version, which changes about once a month.
setInterval(update, 60 * 60 * 1000);
