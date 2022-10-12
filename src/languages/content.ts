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
import { LanguageStore } from './LanguageStore';
import './content-interfaces';

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

let languages = null;
if (globalThis.gLanguageStore) {
  languages = gLanguageStore.languages;
}
globalThis.gLanguageStore = new LanguageStore();
if (languages) {
  gLanguageStore.languages = languages;
}

const navigatorPrototype = Object.getPrototypeOf(navigator);
const navigatorPrototypeWrapped = navigatorPrototype.wrappedJSObject;

// const descriptors = Object.getOwnPropertyDescriptors(navigatorPrototypeWrapped);

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

gLanguageStore.onLanguagesChanged.addListener(() => {
  window.dispatchEvent(new Event('languagechange', {
    bubbles: false,
    cancelable: false,
  }));
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'language-changed') {
    gLanguageStore.languages = String(message.languages ?? '');
  }
});
