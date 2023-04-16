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

import { StorageItem } from "weeg-storage";
import { EventSink } from "weeg-events";
import { ChromiumReleaseService } from "./ChromiumReleaseService";

export type UserAgentPreset = 'default' | 'chrome' | 'googlebot' | 'custom';

export type UserAgentEmulationMode = 'none' | 'chrome';

export type UserAgentParams = {
  preset: UserAgentPreset;
  userAgent?: string;
};

export type UserAgentStorageType = {
  [cookieStoreId: string]: UserAgentParams;
};

export class UserAgentSettings {
  private static readonly STORAGE_KEY = 'feature.uaOverrides.userAgentByContainer';
  private static readonly INSTANCE = new UserAgentSettings();

  public static getInstance(): UserAgentSettings {
    return UserAgentSettings.INSTANCE;
  }

  private readonly _storage = new StorageItem<UserAgentStorageType>(UserAgentSettings.STORAGE_KEY, {}, StorageItem.AREA_LOCAL);
  private readonly _chromeReleaseService = ChromiumReleaseService.getInstance();

  public readonly onChanged = new EventSink<void>();

  private constructor() {
    this._storage.onChanged.addListener(() => {
      this.onChanged.dispatch();
    });
  }

  private async saveValue(value: UserAgentStorageType) {
    await this._storage.setValue(value);
  }

  public async getValue(): Promise<UserAgentStorageType> {
    return this._storage.getValue();
  }

  public async setUserAgent(cookieStoreId: string, preset: UserAgentPreset, userAgent?: string) {
    const value = await this.getValue();
    switch (preset) {
      case 'default': {
        delete value[cookieStoreId];
        break;
      }

      case 'chrome': {
        value[cookieStoreId] = {
          preset: 'chrome',
        };
        break;
      }

      case 'googlebot': {
        value[cookieStoreId] = {
          preset: 'googlebot',
        };
        break;
      }

      default: {
        value[cookieStoreId] = {
          preset: 'custom',
          userAgent,
        };
      }
    }

    await this.saveValue(value);
  }

  /**
   * Returns the user agent string set for the given cookie store id.
   * @param cookieStoreId
   * @returns Promise of the user agent string, or empty string if not set
   */
  public async getUserAgent(cookieStoreId: string): Promise<string> {
    const value = await this.getValue();
    const params = value[cookieStoreId];
    if (!params) {
      return '';
    }

    switch (params.preset) {
      case 'chrome': {
        return this._chromeReleaseService.getUserAgentString();
      }

      case 'googlebot': {
        return 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      }
    }

    return params.userAgent || '';
  }

  public async getUserAgentParams(cookieStoreId: string): Promise<UserAgentParams> {
    const value = await this.getValue();
    const params = value[cookieStoreId];
    if (!params) {
      return {
        preset: 'default',
      };
    }

    return params;
  }

  public async getEmulationMode(cookieStoreId: string): Promise<UserAgentEmulationMode> {
    const ua = await this.getUserAgent(cookieStoreId);
    if (!ua) {
      return 'none';
    }
    return ua.match(/Chrome\/\d/) ? 'chrome' : 'none';
  }
}
