// vim: ts=2 et ai

import { callIgnoringErrors } from "./utils.mjs";

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
      const value = changes[key];
      callIgnoringErrors(aCallback, value);
    });
  }
}

export const config = new Configuration;
