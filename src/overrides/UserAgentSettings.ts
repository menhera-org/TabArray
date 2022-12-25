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

import { StorageItem, StorageArea } from "../frameworks/storage";
import { EventSink } from "../frameworks/utils";
import { OriginAttributes } from '../frameworks/tabGroups';
import { ChromiumReleaseService } from "../modules/ChromiumReleaseService";

export type UserAgentPreset = 'default' | 'chrome' | 'googlebot' | 'custom';

type UserAgentParams = {
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

  private readonly _storage = new StorageItem<StorageType>(UserAgentSettings.STORAGE_KEY, {}, StorageArea.LOCAL);
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

  public setUserAgent(originAttributes: OriginAttributes, preset: UserAgentPreset, userAgent?: string) {
    const key = this.originAttributesToKey(originAttributes);
    switch (preset) {
      case 'default': {
        delete this._value[key];
        break;
      }

      case 'chrome': {
        this._value[key] = {
          preset: 'chrome',
        };
        break;
      }

      case 'googlebot': {
        this._value[key] = {
          preset: 'googlebot',
        };
        break;
      }

      default: {
        this._value[key] = {
          preset: 'custom',
          userAgent,
        };
      }
    }

    this.save();
  }

  /**
   * Returns the user agent string set for the given origin attributes.
   * @param originAttributes
   * @returns the user agent string, or empty string if not set
   */
  public getUserAgent(originAttributes: OriginAttributes): string {
    const key = this.originAttributesToKey(originAttributes);
    const params = this._value[key];
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
}
