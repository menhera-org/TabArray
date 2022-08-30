// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

import { callIgnoringErrors } from "./utils.js";

const CONFIG_STORAGE_PREFIX = 'config.';

export class Configuration {
  constructor() {
    //
  }

  async get(aKey) {
    const key = CONFIG_STORAGE_PREFIX + aKey;
    const values = await browser.storage.sync.get(key);
    if (!values) return void 0;
    return values[key];
  }

  async set(aKey, aValue) {
    const key = CONFIG_STORAGE_PREFIX + aKey;
    await browser.storage.sync.set({
      [key]: aValue,
    });
  }

  observe(aKey, aCallback) {
    const key = CONFIG_STORAGE_PREFIX + aKey;
    if ('function' != typeof aCallback) {
      throw new TypeError('Not a function');
    }
    this.get(aKey).then((value) => {
      callIgnoringErrors(aCallback, value);
    });
    browser.storage.onChanged.addListener((changes, areaName) => {
      if ('sync' != areaName) return;
      if (!(key in changes)) return;
      const {newValue} = changes[key];
      callIgnoringErrors(aCallback, newValue);
    });
  }
}

export const config = new Configuration;
