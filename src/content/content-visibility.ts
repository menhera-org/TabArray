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

import './content-interfaces';
import { StorageItem, StorageArea } from '../frameworks/storage';

let visibilityDisabled = true;
const visibilityDisabledStorage = new StorageItem('tab.visibility.disabled', false, StorageArea.LOCAL);
visibilityDisabledStorage.observe((value) => {
  if (visibilityDisabled != value && document.visibilityState == 'hidden') {
    dispatchEvent();
  }
  visibilityDisabled = value;
});

let eventDispatching = false;
const dispatchEvent = () => {
  if (eventDispatching) {
    return;
  }
  eventDispatching = true;
  document.dispatchEvent(new Event('visibilitychange'));
  eventDispatching = false;
};

const htmlDocumentPrototype = Object.getPrototypeOf(document);
const documentPrototype = Object.getPrototypeOf(htmlDocumentPrototype);
const documentPrototypeWrapped = documentPrototype.wrappedJSObject;

try {
  delete documentPrototypeWrapped.hidden;
  Reflect.defineProperty(documentPrototypeWrapped, 'hidden', {
    enumerable: true,
    configurable: true,
    get: exportFunction(() => {
      if (visibilityDisabled) {
        return false;
      }
      return document.visibilityState == 'hidden';
    }, window),
  });
} catch (e) {
  // ignore.
}

delete documentPrototypeWrapped.visibilityState;
Reflect.defineProperty(documentPrototypeWrapped, 'visibilityState', {
  enumerable: true,
  configurable: true,
  get: exportFunction(() => {
    if (visibilityDisabled) {
      return 'visible';
    }
    return document.visibilityState;
  }, window),
});

document.addEventListener('visibilitychange', (ev) => {
  if (eventDispatching) return;
  if (visibilityDisabled) {
    ev.stopImmediatePropagation();
  }
}, { capture: true });
