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
import { Uint32 } from "weeg-types";
import { CookieStore } from "weeg-containers";

export class TabGroupOptionDirectory {
  private static readonly STORAGE_KEY_AUTOCLEAN_LEGACY = 'cookies.autoclean.enabledUserContexts';
  private static readonly STORAGE_KEY_AUTOCLEAN = 'cookies.autoclean.enabledTabGroupIds';

  private readonly _storageAutocleanLegacy = new StorageItem<Uint32.Uint32[]>(TabGroupOptionDirectory.STORAGE_KEY_AUTOCLEAN_LEGACY, [], StorageItem.AREA_LOCAL);
  private readonly _storageAutoclean = new StorageItem<string[]>(TabGroupOptionDirectory.STORAGE_KEY_AUTOCLEAN, [], StorageItem.AREA_LOCAL);

  public async getAutocleanEnabledTabGroupIds(): Promise<string[]> {
    const hasValue = await this._storageAutoclean.hasValue();
    if (hasValue) {
      return await this._storageAutoclean.getValue();
    }

    const legacyValue = await this._storageAutocleanLegacy.getValue();
    const tabGroupIds = legacyValue.map((userContextId) => CookieStore.fromParams({ userContextId, privateBrowsingId: 0 as Uint32.Uint32}).id);
    await this._storageAutoclean.setValue(tabGroupIds);
    return tabGroupIds;
  }

  public async setAutocleanForTabGroupId(tabGroupId: string, enabled: boolean): Promise<void> {
    const tabGroupIds = await this.getAutocleanEnabledTabGroupIds();
    if (enabled) {
      if (!tabGroupIds.includes(tabGroupId)) {
        tabGroupIds.push(tabGroupId);
        await this._storageAutoclean.setValue(tabGroupIds);
      }
    } else {
      const index = tabGroupIds.indexOf(tabGroupId);
      if (index >= 0) {
        tabGroupIds.splice(index, 1);
        await this._storageAutoclean.setValue(tabGroupIds);
      }
    }
  }
}
