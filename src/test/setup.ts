/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

// Test-only stand-in for the WebExtension APIs, so modules that touch `browser` when they load still load.
// Any API path exists: functions resolve to undefined, except the few below that tests rely on.

const FUNCTIONS: Record<string, (...args: never[]) => unknown> = {
  'i18n.getMessage': (name: string, substitutions?: string | string[]) =>
    name == 'effectiveLocale' ? 'en' : substitutions == null ? name : `${name}(${[substitutions].flat().join(',')})`,
  'i18n.getUILanguage': () => 'en',
  'runtime.getURL': (path: string) => `moz-extension://test/${path.replace(/^\//, '')}`,
  'runtime.getManifest': () => ({ name: 'Container Tab Groups', version: '0.0.0' }),
  'runtime.getBrowserInfo': async () => ({ name: 'Firefox', version: '0.0' }),
  'runtime.getPlatformInfo': async () => ({ os: 'linux' }),
  'runtime.connect': () => ({
    onMessage: { addListener: () => {} },
    onDisconnect: { addListener: () => {} },
    postMessage: () => {},
  }),
  'commands.getAll': async () => [],
  'tabs.query': async () => [],
  'contextualIdentities.query': async () => [],
  'cookies.getAll': async () => [],
  'privacy.websites.firstPartyIsolate.get': async () => ({ value: false }),
  'privacy.websites.cookieConfig.get': async () => ({ value: { behavior: 'reject_trackers' } }),
};

const CONSTANTS: Record<string, unknown> = {
  'runtime.id': 'test@example',
  'windows.WINDOW_ID_NONE': -1,
  'tabs.TAB_ID_NONE': -1,
};

// Names that tools probe for (promises, module interop, JSON). Reporting them as present makes
// `await` and the CommonJS interop loop forever, so they do not exist on the fake.
const NOT_AN_API = new Set(['then', 'default', 'toJSON', 'constructor']);
const isApiName = (property: string | symbol): property is string =>
  typeof property === 'string' && !NOT_AN_API.has(property) && !property.startsWith('__');

const makeApi = (path: string): unknown =>
  new Proxy(() => {}, {
    get(_target, property) {
      if (!isApiName(property)) return undefined;
      const childPath = `${path}.${property}`;
      return childPath in CONSTANTS ? CONSTANTS[childPath] : makeApi(childPath);
    },
    apply(_target, _thisArg, args) {
      const fn = FUNCTIONS[path];
      return fn ? fn(...(args as never[])) : Promise.resolve(undefined);
    },
  });

// Our imports of webextension-polyfill resolve to this `browser` (see src/firefox-browser.ts). The weeg
// libraries require() the real polyfill in tests, which passes `browser` through once chrome.runtime.id exists.
Object.assign(globalThis, {
  chrome: { runtime: { id: 'test@example' } },
  browser: new Proxy(
    {},
    {
      get: (_target, property) => (isApiName(property) ? makeApi(property) : undefined),
    }
  ),
  IS_REACT_ACT_ENVIRONMENT: true,
});
