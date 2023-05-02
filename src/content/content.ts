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
import { LanguageStore } from './LanguageStore';
import './content-interfaces';
import './content-localstorage';
import { UaDataService } from '../lib/overrides/UaDataService';

declare global {
  // eslint-disable-next-line no-var
  var gLanguageStore: LanguageStore;
}

browser.runtime.sendMessage({
  type: 'content-script-loaded',
  url: window.location.href,
}).catch(() => {
  // ignore.
});

let languages: string | null = null;
if (globalThis.gLanguageStore) {
  languages = gLanguageStore.languages;
}
globalThis.gLanguageStore = new LanguageStore();
if (languages) {
  gLanguageStore.languages = languages;
}

const uaDataService = UaDataService.getInstance();

const navigatorPrototype = Object.getPrototypeOf(navigator);
const navigatorPrototypeWrapped = navigatorPrototype.wrappedJSObject;

// const descriptors = Object.getOwnPropertyDescriptors(navigatorPrototypeWrapped);

let languageSetupDone = false;
const setUpLanguageOverrides = () => {
  console.debug('Original language values: languages=%s, language=%s', window.navigator.languages, window.navigator.language);
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
  const userAgent = window.navigator.userAgent;
  if (userAgent.includes('Windows')) {
    return 'Windows';
  } else if (userAgent.includes('Macintosh')) {
    return 'macOS';
  }
  return 'Linux';
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setupUaOverrides = (window: Window & typeof globalThis, navigatorPrototypeWrapped: any) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWrapped = window.wrappedJSObject as any;

    const seenUserAgent = window.navigator.userAgent;
    let userAgent = seenUserAgent;
    try {
      userAgent = window.parent?.navigator.userAgent ?? userAgent;
      userAgent = window.top?.navigator.userAgent ?? userAgent;
    } catch (e) {
      // ignore.
    }
    const brands = uaDataService.getBrands(userAgent);
    const highEntropyBrands = uaDataService.getHighEntropyBrands(userAgent);
    const isMozilla = userAgent.includes('Gecko/');
    const uaDataEnabled = brands.length > 0;
    const isChromium = brands.map((brand) => brand.brand).includes('Chromium');

    // defeat InstallTrigger detection (https://stackoverflow.com/a/9851769)
    if (!isMozilla) {
      delete windowWrapped.InstallTrigger;
      delete windowWrapped.netscape;
      delete windowWrapped.InternalError;
    }

    if (seenUserAgent != userAgent) {
      delete navigatorPrototypeWrapped.userAgent;
      Reflect.defineProperty(navigatorPrototypeWrapped, 'userAgent', {
        configurable: true,
        enumerable: true,
        get: exportFunction(() => userAgent, window),
      });
    }

    if (isChromium) {
      try {
        Reflect.defineProperty(windowWrapped, 'chrome', {
          configurable: false,
          writable: true,
          enumerable: true,
          value: cloneInto({
            app: {},
            csi: {},
            loadTimes: () => { /* nothing */ },
          }, window, { cloneFunctions: true }),
        });
      } catch (e) {
        // ignore
      }
    }

    // this is configurable, so deletable
    delete navigatorPrototypeWrapped.userAgentData;
    Reflect.defineProperty(navigatorPrototypeWrapped, 'userAgentData', {
      configurable: true,
      enumerable: true,
      get: exportFunction(() => {
        if (!uaDataEnabled) {
          return undefined;
        }
        return cloneInto({
          brands: brands,

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
              brands: highEntropyBrands,
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

    if (!isMozilla) {
      const blockPattern = /^(?:resource|chrome):\/\//;

      window.document.addEventListener('load', (ev) => {
        const target = ev.target;
        if (!(target instanceof window.Element)) return;
        const addedNode = target as Element;
        const blockEvent = () => {
          console.debug('Blocked load event for %s', addedNode);
          ev.stopImmediatePropagation();
          ev.preventDefault();
          addedNode.dispatchEvent(new window.Event('error'));
        };
        const tagName = addedNode.tagName.toLowerCase();
        if (tagName == 'link') {
          const link = addedNode as HTMLLinkElement;
          if (link.href.match(blockPattern)) {
            blockEvent();
          }
        } else if (tagName == 'img') {
          const img = addedNode as HTMLImageElement;
          if (img.src.match(blockPattern)) {
            blockEvent();
          }
        } else if (tagName == 'script') {
          const script = addedNode as HTMLScriptElement;
          if (script.src.match(blockPattern)) {
            blockEvent();
          }
        }
      }, { capture: true, passive: false });
    }
  } catch (e) {
    console.error(String(e));
  }
};

if (gLanguageStore.language !== '') {
  setUpLanguageOverrides();
}

setupUaOverrides(window, navigatorPrototypeWrapped);

const visitedIframes = new WeakSet<HTMLIFrameElement>();
const iframeMutationObserver = new MutationObserver(() => {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    if (visitedIframes.has(iframe)) {
      continue;
    }
    if (iframe.contentWindow == null) {
      continue;
    }
    const origin = iframe.contentWindow.origin;
    if (origin == window.origin) {
      visitedIframes.add(iframe);
      setupUaOverrides(iframe.contentWindow as Window & typeof globalThis, Object.getPrototypeOf(iframe.contentWindow.navigator).wrappedJSObject);
    }
  }
});

iframeMutationObserver.observe(document, {attributes: false, childList: true, characterData: false, subtree:true});
