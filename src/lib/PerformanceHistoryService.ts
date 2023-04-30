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

import { BackgroundService } from "weeg-utils";
import { StorageItem } from "weeg-storage";

import { ServiceRegistry } from "./ServiceRegistry";
import { StartupService } from "./StartupService";

export type PerformanceRecord = {
  operationName: string;
  startTime: number; // milliseconds since epoch
  duration: number; // milliseconds
};

const startupService = StartupService.getInstance();

export class PerformanceHistoryService extends BackgroundService<PerformanceRecord, void> {
  private readonly storage = new StorageItem<PerformanceRecord[]>("performanceHistory", [], StorageItem.AREA_LOCAL);
  private storageCache: PerformanceRecord[] | undefined;

  public readonly onChanged = this.storage.onChanged;

  public override getServiceName(): string {
    return 'PerformanceHistoryService';
  }

  protected override initializeBackground(): void {
    startupService.onBeforeStartup.addListener(() => {
      this.storageCache = [];
      this.storage.setValue([]).catch((e) => {
        console.error(e);
      });
    });
  }

  protected override async execute(input: PerformanceRecord): Promise<void> {
    const entries = this.storageCache ?? await this.storage.getValue();
    entries.push(input);
    this.storageCache = entries;
    await this.storage.setValue(entries);
  }

  public addEntry(operationName: string, startTime: number, duration: number): void {
    this.call({
      operationName,
      startTime,
      duration,
    }).catch((e) => {
      console.error(e);
    });
  }

  public getEntries(): Promise<PerformanceRecord[]> {
    return this.storage.getValue();
  }

  public async getOperationNames(): Promise<string[]> {
    const entries = await this.getEntries();
    return Array.from(new Set(entries.map((e) => e.operationName)));
  }

  public async getEntriesByOperationName(operationName: string): Promise<PerformanceRecord[]> {
    const entries = await this.getEntries();
    return entries.filter((e) => e.operationName === operationName);
  }
}

ServiceRegistry.getInstance().registerService('PerformanceHistoryService', PerformanceHistoryService.getInstance<PerformanceHistoryService>());
