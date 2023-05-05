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

import { Asserts } from "weeg-utils";
import { StorageItem } from "weeg-storage";
import { Uint32 } from "weeg-types";
import { ContextualIdentity } from "weeg-containers";

import { ServiceRegistry } from "../ServiceRegistry";
import { PrefixStorageItems } from "../storage/PrefixStorageItems";
import { RandomIdService } from "../RandomIdService";
import { ContextualIdentityService } from "../tabGroups/ContextualIdentityService";
import { CompatConsole } from "../console/CompatConsole";

type SyncedIdentityMetadata = {
  id: string; // synced identity UUID
  syncedTime: number;
};

type SyncedIdentityMapStorageType = {
  [userContextId: Uint32]: SyncedIdentityMetadata;
};

type SyncedIdentityStorageType = {
  id: string; // synced identity UUID
  name: string;
  icon: string;
  color: string;
  updatedTime: number;
  deletedTime: null | number;
};

Asserts.assertBackgroundScript();

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();

export class ContainerSyncService {
  public static readonly IDENTITY_DELETE_DELAY = 1000 * 60 * 60 * 24 * 90; // 90 days

  private static readonly INSTANCE = new ContainerSyncService();

  public static getInstance(): ContainerSyncService {
    return this.INSTANCE;
  }

  private readonly _syncedIdentityMapStorage = new StorageItem<SyncedIdentityMapStorageType>('syncedIdentityMap', {}, StorageItem.AREA_LOCAL);
  private readonly _syncedIdentitiesStorage = new PrefixStorageItems<SyncedIdentityStorageType>('__syncedIdentity__.', PrefixStorageItems.AREA_SYNC);

  private constructor() {
    // do nothing
  }

  public isIdentitySyncable(identity: ContextualIdentity): boolean {
    return !identity.name.includes('tmp');
  }

  public async sync(): Promise<void> {
    const [syncedIdentitiesData, syncedIdentityMap, identities] = await Promise.all([
      this._syncedIdentitiesStorage.getAll(),
      this._syncedIdentityMapStorage.getValue(),
      contextualIdentityFactory.getAll(),
    ]);

    const promises: Promise<unknown | void>[] = [];
    const syncedUserContextIds = new Set(Object.keys(syncedIdentityMap).map((userContextId) => Uint32(userContextId)));
    const identitiesMap = new Map(identities.map((identity) => [identity.cookieStore.userContextId, identity] as const));
    const syncedIdentities = identities.filter((identity) => syncedUserContextIds.has(identity.cookieStore.userContextId));
    const unsyncedIdentities = identities.filter((identity) => !syncedUserContextIds.has(identity.cookieStore.userContextId));
    const syncedIdentityIds = new Set(Object.values(syncedIdentityMap).map((metadata) => metadata.id));

    for (const id in syncedIdentitiesData) {
      const data = syncedIdentitiesData[id] as SyncedIdentityStorageType;
      if (data.deletedTime != null && data.deletedTime + ContainerSyncService.IDENTITY_DELETE_DELAY < Date.now()) {
        console.info('Removing old entry from sync storage: name=%s, id=%s', data.name, id);
        delete syncedIdentitiesData[id];
        continue;
      }
    }

    // update synced identities
    for (const syncedIdentity of syncedIdentities) {
      const userContextId = syncedIdentity.cookieStore.userContextId;
      const metadata = syncedIdentityMap[userContextId] as SyncedIdentityMetadata;
      const id = metadata.id;
      const data = syncedIdentitiesData[id];
      if (!data) {
        console.warn('Synced identity missing in sync storage: name=%s, id=%s, userContextId=%d', syncedIdentity.name, id, userContextId);
        delete syncedIdentityMap[userContextId];
        syncedUserContextIds.delete(userContextId);
        syncedIdentityIds.delete(metadata.id);
        continue;
      }

      if (data.deletedTime != null) {
        promises.push(contextualIdentityFactory.remove(syncedIdentity.cookieStore.id));
      } else if (data.name != syncedIdentity.name || data.icon != syncedIdentity.icon || data.color != syncedIdentity.color) {
        if (data.updatedTime < metadata.syncedTime) {
          data.name = syncedIdentity.name;
          data.icon = syncedIdentity.icon;
          data.color = syncedIdentity.color;
          data.updatedTime = Date.now();
          metadata.syncedTime = Date.now();
          console.info('Updating identity on synced storage: name=%s, id=%s, userContextId=%d', data.name, id, userContextId);
        } else {
          metadata.syncedTime = Date.now();
          promises.push(contextualIdentityFactory.setParams(syncedIdentity.cookieStore.id, { name: data.name, icon: data.icon, color: data.color }));
          console.info('Updating identity from synced storage: name=%s, id=%s, userContextId=%d', data.name, id, userContextId);
        }
      }
    }

    // merge unsynced identities with online identities and create new identities
    mergeLoop: for (const unsyncedIdentity of unsyncedIdentities) {
      if (!this.isIdentitySyncable(unsyncedIdentity)) {
        continue;
      }

      const userContextId = unsyncedIdentity.cookieStore.userContextId;
      for (const id in syncedIdentitiesData) {
        const data = syncedIdentitiesData[id] as SyncedIdentityStorageType;
        if (data.deletedTime != null) {
          continue;
        }
        if (syncedIdentityIds.has(id)) {
          continue;
        }
        if (data.name != unsyncedIdentity.name) {
          continue;
        }
        if (data.icon != unsyncedIdentity.icon || data.color != unsyncedIdentity.color) {
          data.icon = unsyncedIdentity.icon;
          data.color = unsyncedIdentity.color;
          data.updatedTime = Date.now();
        }
        syncedIdentityMap[userContextId] = {
          id,
          syncedTime: Date.now(),
        };
        syncedUserContextIds.add(userContextId);
        syncedIdentityIds.add(id);
        console.info('Merged local identity with synced identity: name=%s, id=%s, userContextId=%d', data.name, id, userContextId);
        continue mergeLoop;
      }

      const newId = RandomIdService.getInstance().getRandomId();
      syncedIdentityMap[userContextId] = {
        id: newId,
        syncedTime: Date.now(),
      };
      syncedUserContextIds.add(userContextId);
      syncedIdentityIds.add(newId);

      syncedIdentitiesData[newId] = {
        id: newId,
        name: unsyncedIdentity.name,
        icon: unsyncedIdentity.icon,
        color: unsyncedIdentity.color,
        updatedTime: Date.now(),
        deletedTime: null,
      };
      console.info('Created a new identity on synced storage: name=%s, id=%s, userContextId=%d', unsyncedIdentity.name, newId, userContextId);
    }

    // import new identities from sync storage
    for (const id in syncedIdentitiesData) {
      const data = syncedIdentitiesData[id] as SyncedIdentityStorageType;
      if (data.deletedTime != null) {
        continue;
      }
      if (syncedIdentityIds.has(id)) {
        for (const syncedUserContextId of syncedUserContextIds) {
          const metadata = syncedIdentityMap[syncedUserContextId] as SyncedIdentityMetadata;
          if (!metadata) continue;
          if (metadata.id != id) continue;
          if (identitiesMap.has(syncedUserContextId)) break;
          data.deletedTime = Date.now();
          console.info('Deleting missing identity from synced storage: ', data.name);
          break;
        }
        continue;
      }
      const identity = await contextualIdentityFactory.create({ name: data.name, icon: data.icon, color: data.color });
      console.info('Imported identity from sync storage: name=%s, id=%s, cookieStoreId=%s', data.name, id, identity.cookieStore.id);
      const userContextId = identity.cookieStore.userContextId;
      syncedIdentityMap[userContextId] = {
        id: id,
        syncedTime: Date.now(),
      };
      syncedUserContextIds.add(userContextId);
      syncedIdentityIds.add(id);
    }

    promises.push(this._syncedIdentitiesStorage.setAll(syncedIdentitiesData));
    promises.push(this._syncedIdentityMapStorage.setValue(syncedIdentityMap));
    await Promise.all(promises);
  }
}

ServiceRegistry.getInstance().registerService('ContainerSyncService', ContainerSyncService.getInstance());
