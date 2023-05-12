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
import { Asserts } from "weeg-utils";

import { StartupService } from "./StartupService";
import { ServiceRegistry } from "./ServiceRegistry";

// throws an error if not in background script
Asserts.assertBackgroundScript();

const startupService = StartupService.getInstance();

export class ElapsedTimeService {
  private static readonly INSTANCE = new ElapsedTimeService();

  public static getInstance(): ElapsedTimeService {
    return ElapsedTimeService.INSTANCE;
  }

  private _cachedValue: number | null = null;
  private readonly _storage = new StorageItem<number>("startedTime", 0, StorageItem.AREA_LOCAL);

  private constructor() {
    startupService.onStartup.addListener(() => {
      const now = Date.now();
      this._cachedValue = now;
      this._storage.setValue(now).catch((e) => {
        console.error(e);
      });
    });
  }

  public async getElapsedTime(): Promise<number> {
    const startedTime = this._cachedValue ?? await this._storage.getValue();
    this._cachedValue = startedTime;
    if (startedTime == 0) {
      return 0;
    }
    return Date.now() - startedTime;
  }
}

ServiceRegistry.getInstance().registerService('ElapsedTimeService', ElapsedTimeService.getInstance());
