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
import { ExtensionService } from '../extension';
import { WindowService } from './WindowService';
import { Tab } from './Tab';

export class PrivateBrowsingService {
  private static readonly INSTANCE = new PrivateBrowsingService();

  public static getInstance(): PrivateBrowsingService {
    return PrivateBrowsingService.INSTANCE;
  }

  private readonly _extensionService = ExtensionService.getInstance();
  private readonly _windowService = WindowService.getInstance();

  private constructor() {
    // Do nothing.
  }

  private async checkForPrivateBrowsingSupport(): Promise<void> {
    const supported = await this._extensionService.isAllowedInPrivateBrowsing();
    if (!supported) {
      throw new Error('This extension is not allowed in private browsing.');
    }
  }

  public async getOpenPrivateWindowId(): Promise<number | undefined> {
    await this.checkForPrivateBrowsingSupport();

    const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
    let windowId: number | undefined;
    for (const window of windows) {
      if (window.incognito) {
        windowId = window.id;
      }
    }
    return windowId;
  }

  /**
   * Open a new private browsing window.
   * @returns the window ID of the created private browsing window
   */
  public async openPrivateWindow(): Promise<number> {
    await this.checkForPrivateBrowsingSupport();

    const browserWindow = await browser.windows.create({
      incognito: true,
    });
    if (null == browserWindow.id) {
      throw new Error('browserWindow.id is null.');
    }
    return browserWindow.id;
  }

  public async openTabInPrivateBrowsing(url: string, currentWindowId?: number): Promise<Tab> {
    await this.checkForPrivateBrowsingSupport();

    let windowId: number | undefined = undefined;
    if (undefined != currentWindowId) {
      const windowIsPrivate = await this._windowService.isPrivateWindow(currentWindowId);
      if (windowIsPrivate) {
        windowId = currentWindowId;
      }
    }
    if (undefined == windowId) {
      windowId = await this.getOpenPrivateWindowId();
    }
    if (undefined == windowId) {
      windowId = await this.openPrivateWindow();
    }
    const browserTab = await browser.tabs.create({
      url: url,
      windowId: windowId,
    });
    return new Tab(browserTab);
  }

  public async clearBrowsingData(): Promise<void> {
    await this.checkForPrivateBrowsingSupport();

    await browser.browsingData.remove({
      cookieStoreId: 'firefox-private',
    }, {
      cookies: true,
      localStorage: true, // not supported on old Firefox
      indexedDB: true,
    });
  }
}
