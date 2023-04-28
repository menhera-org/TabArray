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

import { ChromiumReleaseService } from "./ChromiumReleaseService";
import { AbstractPerContainerSettings } from "./AbstractPerContainerSettings";

export type UserAgentPreset = 'default' | 'chrome' | 'googlebot' | 'custom';

export type UserAgentEmulationMode = 'none' | 'chrome';

export type UserAgentParams = {
  preset: UserAgentPreset;
  userAgent?: string;
};

export type UserAgentStorageType = {
  [cookieStoreId: string]: UserAgentParams;
};

export class UserAgentSettings extends AbstractPerContainerSettings<UserAgentParams> {
  private static readonly STORAGE_KEY = 'feature.uaOverrides.userAgentByContainer';
  private static readonly INSTANCE = new UserAgentSettings();

  public static getInstance(): UserAgentSettings {
    return UserAgentSettings.INSTANCE;
  }

  private readonly _chromeReleaseService = ChromiumReleaseService.getInstance();

  private constructor() {
    super();
  }

  protected override getStorageKey(): string {
    return UserAgentSettings.STORAGE_KEY;
  }

  public async setValueForTabGroup(tabGroupId: string, params: UserAgentParams) {
    const { preset, userAgent } = params;
    switch (preset) {
      case 'default': {
        await this.removeTabGroup(tabGroupId);
        return;
      }

      case 'chrome': {
        await this.rawSetValueForTabGroup(tabGroupId, {
          preset: 'chrome',
        });
        return;
      }

      case 'googlebot': {
        await this.rawSetValueForTabGroup(tabGroupId, {
          preset: 'googlebot',
        });
        return;
      }

      default: {
        await this.rawSetValueForTabGroup(tabGroupId, {
          preset: 'custom',
          userAgent,
        });
        return;
      }
    }
  }

  public async setUserAgent(tabGroupId: string, preset: UserAgentPreset, userAgent?: string) {
    await this.setValueForTabGroup(tabGroupId, {
      preset,
      userAgent,
    });
  }

  /**
   * Returns the user agent string set for the given cookie store id.
   * @param tabGroupId
   * @returns Promise of the user agent string, or empty string if not set
   */
  public async getUserAgent(tabGroupId: string): Promise<string> {
    const params = await this.getValueForTabGroup(tabGroupId);
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

  public async getUserAgentParams(tabGroupId: string): Promise<UserAgentParams> {
    const params = await this.getValueForTabGroup(tabGroupId);
    if (!params) {
      return {
        preset: 'default',
      };
    }

    return params;
  }
}
