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

  public async getOpenPrivateWindowId(): Promise<number | undefined> {
    const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
    let windowId: number | undefined;
    for (const window of windows) {
      if (window.incognito) {
        windowId = window.id;
      }
    }
    return windowId;
  }

  public async openTabInPrivateBrowsing(url: string, currentWindowId?: number): Promise<Tab> {
    const supported = await this._extensionService.isAllowedInPrivateBrowsing();
    if (!supported) {
      throw new Error('This extension is not allowed in private browsing.');
    }
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
    const browserTab = await browser.tabs.create({
      url: url,
      windowId: windowId,
    });
    return new Tab(browserTab);
  }
}
