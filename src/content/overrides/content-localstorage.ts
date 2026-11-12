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

import browser from 'webextension-polyfill';

// Only whether the origin has local storage is recorded, so report it when that changes, not on every storage event.
let reportedHasLocalStorage: boolean | undefined;

const notifyStorageData = () => {
  // Opaque origins (sandboxed frames, data: URLs) have no host to record.
  if (window.location.origin == 'null') return;
  let localStorageLength: number;
  try {
    localStorageLength = window.localStorage.length;
  } catch {
    return; // Storage access can be denied, for example in sandboxed frames.
  }
  const hasLocalStorage = localStorageLength > 0;
  if (hasLocalStorage === reportedHasLocalStorage) return;
  reportedHasLocalStorage = hasLocalStorage;
  browser.runtime
    .sendMessage({
      type: 'content-localstorage-statistics',
      payload: {
        origin: window.location.origin,
        localStorageLength,
      },
    })
    .catch(() => {
      // ignore.
    });
};

window.addEventListener('storage', notifyStorageData);
notifyStorageData();
