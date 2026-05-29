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
import { Asserts } from "weeg-utils";

import { CachedStorageItem } from "../storage/CachedStorageItem";
import { ServiceRegistry } from "../ServiceRegistry";

export type TabCountByWindow = {
  [windowId: number]: number; // tab count
};

export type WindowTabCountHistoryEntry = {
  windowId: number;
  time: number; // milliseconds since epoch
  count: number;
};

export type WindowTabCountHistory = {
  [windowId: number]: WindowTabCountHistoryEntry[];
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WindowTabCountHistory {
  export function createFromTabCountByWindow(tabCountByWindow: TabCountByWindow): WindowTabCountHistory {
    const now = Date.now();
    const history: WindowTabCountHistory = {};
    for (const windowId in tabCountByWindow) {
      const count = tabCountByWindow[windowId] as number;
      const entry: WindowTabCountHistoryEntry = {
        windowId: parseInt(windowId, 10),
        time: now,
        count,
      };
      history[windowId] = [entry];
    }
    return history;
  }

  export function getWindowIds(history: WindowTabCountHistory): number[] {
    return Object.keys(history).map((windowId) => parseInt(windowId, 10));
  }

  export function getLastTabCountForWindow(history: WindowTabCountHistory, windowId: number): number | undefined {
    const entries = history[windowId];
    if (!entries || entries.length < 1) {
      return undefined;
    }

    const entry = entries[entries.length - 1] as WindowTabCountHistoryEntry;

    return entry.count;
  }

  export function incrementTabCountForWindow(history: WindowTabCountHistory, windowId: number): void {
    const entries = history[windowId];
    if (!entries || entries.length < 1) {
      return;
    }

    const lastEntry = entries[entries.length - 1] as WindowTabCountHistoryEntry;
    const count = lastEntry.count;

    const newEntry: WindowTabCountHistoryEntry = {
      windowId,
      time: Date.now(),
      count: count + 1,
    };
    entries.push(newEntry);
  }

  export function decrementTabCountForWindow(history: WindowTabCountHistory, windowId: number): void {
    const entries = history[windowId];
    if (!entries || entries.length < 1) {
      return;
    }

    const lastEntry = entries[entries.length - 1] as WindowTabCountHistoryEntry;
    const count = lastEntry.count;

    const newEntry: WindowTabCountHistoryEntry = {
      windowId,
      time: Date.now(),
      count: count - 1,
    };
    entries.push(newEntry);
  }

  export function addWindow(history: WindowTabCountHistory, windowId: number, tabCount: number): void {
    const entries = history[windowId] ?? [];
    const entry: WindowTabCountHistoryEntry = {
      windowId,
      time: Date.now(),
      count: tabCount,
    };
    entries.push(entry);
    history[windowId] = entries;
  }

  export function removeWindow(history: WindowTabCountHistory, windowId: number): void {
    const entries = history[windowId] ?? [];
    const entry: WindowTabCountHistoryEntry = {
      windowId,
      time: Date.now(),
      count: 0,
    };
    entries.push(entry);
    history[windowId] = entries;
  }
}

export class WindowTabCountService extends BackgroundService<void, WindowTabCountHistory> {
  private readonly _storage = new CachedStorageItem<WindowTabCountHistory>("windowTabCountHistory", {}, CachedStorageItem.AREA_LOCAL);

  public readonly onChanged = this._storage.onChanged;

  public override getServiceName(): string {
    return 'WindowTabCountService';
  }

  protected override initializeBackground(): void {
    // nothing to do
  }

  /**
   * This sets initial windows. Private windows should not be added.
   */
  public setInitialTabCounts(counts: TabCountByWindow): Promise<void> {
    Asserts.assertBackgroundScript();
    const history = WindowTabCountHistory.createFromTabCountByWindow(counts);
    return this._storage.setValue(history);
  }

  /**
   * This does not work unless you add the window.
   */
  public incrementTabCountForWindow(windowId: number): void {
    Asserts.assertBackgroundScript();
    this._storage.doUpdateTransaction((value) => {
      WindowTabCountHistory.incrementTabCountForWindow(value, windowId);
      return value;
    });
  }

  /**
   * This does not work unless you add the window.
   */
  public decrementTabCountForWindow(windowId: number): void {
    Asserts.assertBackgroundScript();
    this._storage.doUpdateTransaction((value) => {
      WindowTabCountHistory.decrementTabCountForWindow(value, windowId);
      return value;
    });
  }

  /**
   * Private windows should not be added.
   */
  public addWindow(windowId: number, tabCount: number): void {
    Asserts.assertBackgroundScript();
    this._storage.doUpdateTransaction((value) => {
      WindowTabCountHistory.addWindow(value, windowId, tabCount);
      return value;
    });
  }

  public removeWindow(windowId: number): void {
    Asserts.assertBackgroundScript();
    this._storage.doUpdateTransaction((value) => {
      WindowTabCountHistory.removeWindow(value, windowId);
      return value;
    });
  }

  protected override execute(): Promise<WindowTabCountHistory> {
    return this._storage.getValue();
  }

  public getTabCountHistory(): Promise<WindowTabCountHistory> {
    return this.call();
  }
}

ServiceRegistry.getInstance().registerService('WindowTabCountService', WindowTabCountService.getInstance<WindowTabCountService>());
