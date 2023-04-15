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

import { UserAgentSettings } from './UserAgentSettings';
import { config } from '../config/config';
import { ContentScriptRegistrar } from './ContentScriptRegistrar';

export class UaContentScriptRegistrar extends ContentScriptRegistrar {
  private readonly settings: UserAgentSettings = UserAgentSettings.getInstance();

  public constructor() {
    super();
    this.settings.onChanged.addListener(() => {
      this.updateInBackground();
    });
    config['feature.uaOverrides'].observe(() => {
      this.updateInBackground();
    })
  }

  private async getEnabledStatus(): Promise<boolean> {
    return config['feature.uaOverrides'].getValue();
  }

  public async getContentScriptString(cookieStoreId: string): Promise<string> {
    const ua = await this.settings.getUserAgent(cookieStoreId);
    const emulationMode = await this.settings.getEmulationMode(cookieStoreId);
    const code = `
      globalThis.gUaStore = globalThis.gUaStore || {};
      gUaStore.userAgent = ${JSON.stringify(ua)};
      gUaStore.emulationMode = ${JSON.stringify(emulationMode)};
    `;
    console.debug('UaContentScriptRegistrar.getContentScriptString', cookieStoreId, code);
    return code;
  }

  public async deleteUserAgent(): Promise<void> {
    const browserTabs = await browser.tabs.query({});
    for (const browserTab of browserTabs) {
      if (null == browserTab.id) continue;

      browser.tabs.sendMessage(browserTab.id, {
        type: 'ua-changed',
        emulationMode: 'none',
        userAgent: '',
      }).catch(() => {
        // ignore.
      });
    }
  }

  public async update(): Promise<void> {
    const enabled = await this.getEnabledStatus();
    if (!enabled) {
      await this.unregisterAll();
      await this.deleteUserAgent();
      return;
    }

    await this.registerAll();

    const browserTabs = await browser.tabs.query({});
    for (const browserTab of browserTabs) {
      if (!browserTab.cookieStoreId || null == browserTab.id) continue;
      const emulationMode = this.settings.getEmulationMode(browserTab.cookieStoreId);
      const userAgent = this.settings.getUserAgent(browserTab.cookieStoreId);

      browser.tabs.sendMessage(browserTab.id, {
        type: 'ua-changed',
        emulationMode,
        userAgent,
      }).catch(() => {
        // ignore.
      });
    }
  }

  public updateInBackground(): void {
    this.update().catch((e) => {
      console.error(e);
    });
  }
}
