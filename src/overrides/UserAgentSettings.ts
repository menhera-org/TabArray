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

import { StorageItem } from "weeg-storage";
import { EventSink } from "../frameworks/utils";
import { OriginAttributes } from '../frameworks/tabGroups';
import { ChromiumReleaseService } from "./ChromiumReleaseService";

export type UserAgentPreset = 'default' | 'chrome' | 'googlebot' | 'custom';

export type UserAgentEmulationMode = 'none' | 'chrome';

export type UserAgentParams = {
  preset: UserAgentPreset;
  userAgent?: string;
};

type StorageType = {
  [cookieStoreId: string]: UserAgentParams;
};

export class UserAgentSettings {
  private static readonly STORAGE_KEY = 'feature.uaOverrides.userAgentByContainer';
  private static readonly INSTANCE = new UserAgentSettings();

  public static getInstance(): UserAgentSettings {
    return UserAgentSettings.INSTANCE;
  }

  private readonly _storage = new StorageItem<StorageType>(UserAgentSettings.STORAGE_KEY, {}, StorageItem.AREA_LOCAL);
  private _value: StorageType = {};
  private readonly _chromeReleaseService = ChromiumReleaseService.getInstance();

  public readonly onChanged = new EventSink<void>();

  private constructor() {
    this._storage.observe((newValue) => {
      this._value = newValue;
      this.onChanged.dispatch();
    }, true);
  }

  private originAttributesToKey(originAttributes: OriginAttributes): string {
    return originAttributes.cookieStoreId;
  }

  private save() {
    this._storage.setValue(this._value).catch((e) => {
      console.error(e);
    });
  }

  public getValue(): StorageType {
    return {
      ... this._value,
    };
  }

  public setUserAgent(cookieStoreId: string, preset: UserAgentPreset, userAgent?: string) {
    switch (preset) {
      case 'default': {
        delete this._value[cookieStoreId];
        break;
      }

      case 'chrome': {
        this._value[cookieStoreId] = {
          preset: 'chrome',
        };
        break;
      }

      case 'googlebot': {
        this._value[cookieStoreId] = {
          preset: 'googlebot',
        };
        break;
      }

      default: {
        this._value[cookieStoreId] = {
          preset: 'custom',
          userAgent,
        };
      }
    }

    this.save();
  }

  /**
   * Returns the user agent string set for the given cookie store id.
   * @param cookieStoreId
   * @returns the user agent string, or empty string if not set
   */
  public getUserAgent(cookieStoreId: string): string {
    const params = this._value[cookieStoreId];
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

  public getUserAgentParams(cookieStoreId: string): UserAgentParams {
    const params = this._value[cookieStoreId];
    if (!params) {
      return {
        preset: 'default',
      };
    }

    return params;
  }

  public getEmulationMode(cookieStoreId: string): UserAgentEmulationMode {
    const ua = this.getUserAgent(cookieStoreId);
    if (!ua) {
      return 'none';
    }
    return ua.match(/Chrome\/\d/) ? 'chrome' : 'none';
  }
}
