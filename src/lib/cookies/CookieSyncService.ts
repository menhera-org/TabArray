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
import { ExtensionService } from 'weeg-utils';

import { ServiceRegistry } from '../ServiceRegistry';
import { ReadCachedStorageItem } from '../storage/ReadCachedStorageItem';

import { SyncedCookie } from './SyncedCookie';

const extensionService = ExtensionService.getInstance();

export class CookieSyncService {
  private static readonly INSTANCE = new CookieSyncService();

  public static getInstance(): CookieSyncService {
    return CookieSyncService.INSTANCE;
  }

  private readonly _syncedCookies = new ReadCachedStorageItem<SyncedCookie[]>("syncedCookies", [], ReadCachedStorageItem.AREA_LOCAL);
  private readonly _syncedCookieStoreIds = new ReadCachedStorageItem<string[]>("syncedCookieStoreIds", [], ReadCachedStorageItem.AREA_LOCAL);

  private constructor() {
    if (extensionService.isBackgroundPage()) {
      browser.cookies.onChanged.addListener(async (changeInfo) => {
        const { removed, cookie } = changeInfo;
        const cookieStoreId = cookie.storeId;
        const syncedCookieStoreIds = await this._syncedCookieStoreIds.getValue();
      });
    }
  }
}
