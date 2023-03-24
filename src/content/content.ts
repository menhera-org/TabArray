// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

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
import { LanguageStore } from './LanguageStore';
import { UaStore } from './UaStore';
import './content-interfaces';
import './content-localstorage';

declare global {
  // eslint-disable-next-line no-var
  var gLanguageStore: LanguageStore;

  // eslint-disable-next-line no-var
  var gUaStore: UaStore;
}

browser.runtime.sendMessage({
  type: 'content-script-loaded',
  url: window.location.href,
}).catch(() => {
  // ignore.
});

let languages = null;
if (globalThis.gLanguageStore) {
  languages = gLanguageStore.languages;
}
globalThis.gLanguageStore = new LanguageStore();
if (languages) {
  gLanguageStore.languages = languages;
}

let userAgent = null;
let emulationMode = null;
if (globalThis.gUaStore) {
  userAgent = gUaStore.userAgent;
  emulationMode = gUaStore.emulationMode;
}
globalThis.gUaStore = new UaStore();
if (userAgent) {
  gUaStore.userAgent = userAgent;
}
if (emulationMode) {
  gUaStore.emulationMode = emulationMode;
}

const navigatorPrototype = Object.getPrototypeOf(navigator);
const navigatorPrototypeWrapped = navigatorPrototype.wrappedJSObject;

// const descriptors = Object.getOwnPropertyDescriptors(navigatorPrototypeWrapped);

let languageSetupDone = false;
const setUpLanguageOverrides = () => {
  // this is configurable, so deletable
  delete navigatorPrototypeWrapped.languages;

  // navigator.languages is a getter, so we need to define it as a getter
  Reflect.defineProperty(navigatorPrototypeWrapped, 'languages', {
    configurable: true,
    enumerable: true,
    get: exportFunction(() => {
      let languages = gLanguageStore.languageList;
      if (languages.length < 1) {
        languages = navigator.languages;
      }
      return cloneInto(languages, window);
    }, window),
  });

  // this is configurable, so deletable
  delete navigatorPrototypeWrapped.language;

  // navigator.language is a getter, so we need to define it as a getter
  Reflect.defineProperty(navigatorPrototypeWrapped, 'language', {
    configurable: true,
    enumerable: true,
    get: exportFunction(() => {
      let language = gLanguageStore.language;
      if (language === '') {
        language = navigator.language;
      }
      return cloneInto(language, window);
    }, window),
  });

  languageSetupDone = true;
};

gLanguageStore.onLanguagesChanged.addListener(() => {
  if (!languageSetupDone && gLanguageStore.language !== '') {
    setUpLanguageOverrides();
  }
  window.dispatchEvent(new Event('languagechange', {
    bubbles: false,
    cancelable: false,
  }));
});

const getUaDataPlatform = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) {
    return 'Windows';
  } else if (userAgent.includes('Macintosh')) {
    return 'macOS';
  }
  return 'Linux';
};

let uaSetupDone = false;
const setupUaOverrides = () => {
  try {
    // this is configurable, so deletable
    delete navigatorPrototypeWrapped.userAgent;

    // navigator.userAgent is a getter, so we need to define it as a getter
    Reflect.defineProperty(navigatorPrototypeWrapped, 'userAgent', {
      configurable: true,
      enumerable: true,
      get: exportFunction(() => {
        let userAgent = gUaStore.userAgent;
        if (userAgent === '') {
          userAgent = navigator.userAgent;
        }
        return cloneInto(userAgent, window);
      }, window),
    });

    // this is configurable, so deletable
    delete navigatorPrototypeWrapped.userAgentData;
    Reflect.defineProperty(navigatorPrototypeWrapped, 'userAgentData', {
      configurable: true,
      enumerable: true,
      get: exportFunction(() => {
        const emulationMode = gUaStore.emulationMode;
        if (emulationMode === 'none') {
          return undefined;
        }
        const userAgent = gUaStore.userAgent;
        const chromeVersion = (userAgent.match(/Chrome\/([0-9]+)/) ?? []).pop() ?? '108';
        return cloneInto({
          brands: [
            {
              "brand": "Not?A_Brand",
              "version": "8",
            },
            {
              "brand": "Chromium",
              "version": chromeVersion,
            },
            {
              "brand": "Google Chrome",
              "version": chromeVersion,
            },
          ],

          mobile: false,

          platform: getUaDataPlatform(),

          toJSON() {
            return cloneInto({
              brands: this.brands,
              mobile: this.mobile,
              platform: this.platform,
            }, window);
          },

          getHighEntropyValues() {
            return window.Promise.resolve(cloneInto({
              brands: this.brands,
              mobile: this.mobile,
              platform: this.platform,
              platformVersion: '',
              architecture: '',
              bitness: '',
              model: '',
              uaFullVersion: '',
              fullVersionList: [],
            }, window));
          },
        }, window, {
          cloneFunctions: true,
        });
      }, window),
    });
  } catch (e) {
    console.error(String(e));
  }

  uaSetupDone = true;
};

gUaStore.onChanged.addListener(() => {
  if (!uaSetupDone && gUaStore.userAgent !== '') {
    setupUaOverrides();
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'language-changed') {
    const languages = String(message.languages ?? '');
    if (gLanguageStore.languages !== languages) {
      gLanguageStore.languages = languages;
    }
  } else if (message.type === 'ua-changed') {
    const userAgent = String(message.userAgent ?? '');
    const emulationMode = String(message.emulationMode ?? 'none');
    if (gUaStore.userAgent !== userAgent) {
      gUaStore.userAgent = userAgent;
    }
    if (gUaStore.emulationMode !== emulationMode) {
      gUaStore.emulationMode = emulationMode;
    }
  }
});

if (gLanguageStore.language !== '') {
  setUpLanguageOverrides();
}

if (gUaStore.userAgent !== '') {
  setupUaOverrides();
}
