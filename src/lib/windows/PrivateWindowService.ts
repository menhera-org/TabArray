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

import { ServiceRegistry } from "../ServiceRegistry";

/**
 * Track IDs of non-private windows.
 */
export class PrivateWindowService {
  private static readonly NONPRIVATE_WINDOW_STORAGE_KEY = 'nonprivateWindowIds';

  private static readonly INSTANCE = new PrivateWindowService();

  public static getInstance(): PrivateWindowService {
    return PrivateWindowService.INSTANCE;
  }

  private readonly _storage = new StorageItem<number[]>(PrivateWindowService.NONPRIVATE_WINDOW_STORAGE_KEY, [], StorageItem.AREA_LOCAL);

  private constructor() {
    // Nothing to do.
  }

  public async setNonPrivateWindowIds(windowIds: number[]): Promise<void> {
    await this._storage.setValue(windowIds);
  }

  public async addNonPrivateWindowId(windowId: number): Promise<void> {
    const ids = await this._storage.getValue();
    if (!ids.includes(windowId)) {
      ids.push(windowId);
      await this._storage.setValue(ids);
    }
  }

  public async removeNonPrivateWindowId(windowId: number): Promise<void> {
    const ids = await this._storage.getValue();
    const index = ids.indexOf(windowId);
    if (index >= 0) {
      ids.splice(index, 1);
      await this._storage.setValue(ids);
    }
  }

  public async isPrivateWindow(windowId: number): Promise<boolean> {
    const ids = await this._storage.getValue();
    return !ids.includes(windowId);
  }
}

ServiceRegistry.getInstance().registerService('PrivateWindowService', PrivateWindowService.getInstance());
