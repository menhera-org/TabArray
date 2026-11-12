/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import { Asserts } from 'weeg-utils';
import { StorageItem } from 'weeg-storage';

import { PrefixStorageItems } from '../storage/PrefixStorageItems';
import { RandomIdService } from '../RandomIdService';
import { TabGroupDirectory } from '../tabGroups/TabGroupDirectory';
import { ContainerSyncService } from './ContainerSyncService';
import { reconcileGroups, SyncedGroup, SyncedGroupMetadata } from './reconcileGroups';

Asserts.assertBackgroundScript();

/** Syncs container groups between devices; runs after ContainerSyncService, whose IDs it uses. */
export class GroupSyncService {
  private static readonly INSTANCE = new GroupSyncService();

  public static getInstance(): GroupSyncService {
    return this.INSTANCE;
  }

  private readonly _syncedGroups = new PrefixStorageItems<SyncedGroup>(
    '__syncedGroup__.',
    PrefixStorageItems.AREA_SYNC
  );
  private readonly _groupMap = new StorageItem<Record<string, SyncedGroupMetadata>>(
    'syncedGroupMap',
    {},
    StorageItem.AREA_LOCAL
  );
  private readonly _tabGroupDirectory = TabGroupDirectory.getInstance();

  private constructor() {
    // do nothing
  }

  public async sync(): Promise<void> {
    const [remote, groupMap, local, identityIds] = await Promise.all([
      this._syncedGroups.getAll(),
      this._groupMap.getValue(),
      this._tabGroupDirectory.getValue(),
      ContainerSyncService.getInstance().getSyncedIdentityIds(),
    ]);
    const next = reconcileGroups({ local, remote, groupMap }, identityIds, Date.now(), () =>
      RandomIdService.getInstance().getRandomId()
    );
    // Sync storage has write limits, so only changed entries are written.
    if (JSON.stringify(next.local) != JSON.stringify(local)) {
      await this._tabGroupDirectory.setValue(next.local);
    }
    for (const [id, group] of Object.entries(next.remote)) {
      if (JSON.stringify(group) != JSON.stringify(remote[id])) await this._syncedGroups.set(id, group);
    }
    for (const id of Object.keys(remote)) {
      if (!(id in next.remote)) await this._syncedGroups.delete(id);
    }
    await this._groupMap.setValue(next.groupMap);
  }
}
