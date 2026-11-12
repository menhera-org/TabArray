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

/*
  Container groups synced between devices, the way containers are (ContainerSyncService).
  Each group is one synced entry. Members are stored by synced IDs, since local IDs differ
  between devices: containers by their synced container ID, groups by their synced group ID.
*/

import type { SupergroupStorageType, SupergroupType } from '../tabGroups/TabGroupDirectory';

const GROUP_PREFIX = 'tabarray-supergroup-';
const ROOT = `${GROUP_PREFIX}0`;
const SYNCED_ROOT = 'root';
const NO_CONTAINER = 'firefox-default';
export const GROUP_DELETE_DELAY = 1000 * 60 * 60 * 24 * 90; // 90 days, as for containers

export type SyncedGroup = {
  id: string;
  name: string;
  members: string[];
  updatedTime: number;
  deletedTime: number | null;
};

export type SyncedGroupMetadata = {
  id: string;
  syncedTime: number;
};

export type GroupSyncState = {
  /** The local directory of container groups. */
  local: SupergroupStorageType;
  /** Synced groups, by synced ID. */
  remote: Record<string, SyncedGroup>;
  /** Local group ID to synced ID, with when it last matched. */
  groupMap: Record<string, SyncedGroupMetadata>;
};

const sameMembers = (a: readonly string[], b: readonly string[]) =>
  a.length == b.length && a.every((member, i) => member == b[i]);

/**
 * One sync round. Per group, the side that changed since the last sync wins, the synced side when
 * both did, as for containers. `identityIds` maps local container IDs to synced container IDs;
 * containers without one (temporary ones, or not synced yet) stay where they are locally.
 */
export const reconcileGroups = (
  state: GroupSyncState,
  identityIds: ReadonlyMap<string, string>,
  now: number,
  newId: () => string
): GroupSyncState => {
  const local = structuredClone(state.local);
  const remote = structuredClone(state.remote);
  const groupMap = structuredClone(state.groupMap);
  const isGroup = (tabGroupId: string) => tabGroupId.startsWith(GROUP_PREFIX);

  for (const [id, group] of Object.entries(remote)) {
    if (group.deletedTime != null && group.deletedTime + GROUP_DELETE_DELAY < now) delete remote[id];
  }
  groupMap[ROOT] ??= { id: SYNCED_ROOT, syncedTime: 0 };

  // Groups deleted on this device are deleted for the others.
  for (const [localId, meta] of Object.entries(groupMap)) {
    if (local[localId]) continue;
    const group = remote[meta.id];
    if (group && localId != ROOT) {
      group.deletedTime = now;
      group.updatedTime = now;
    }
    delete groupMap[localId];
  }

  // New groups here: the first time, one with the same name elsewhere is the same group.
  const mappedIds = () => new Set(Object.values(groupMap).map((meta) => meta.id));
  for (const [localId, group] of Object.entries(local)) {
    if (groupMap[localId]) continue;
    const taken = mappedIds();
    const match = Object.values(remote).find(
      (synced) =>
        synced.deletedTime == null && synced.id != SYNCED_ROOT && !taken.has(synced.id) && synced.name == group.name
    );
    groupMap[localId] = match ? { id: match.id, syncedTime: 0 } : { id: newId(), syncedTime: now };
  }

  // Groups made elsewhere are created here; their members are filled in below.
  const taken = mappedIds();
  let nextNumber = Math.max(0, ...Object.values(local).map((group) => group.supergroupId)) + 1;
  for (const synced of Object.values(remote)) {
    if (synced.deletedTime != null || taken.has(synced.id)) continue;
    const localId = `${GROUP_PREFIX}${nextNumber}`;
    local[localId] = { supergroupId: nextNumber, name: synced.name, members: [] };
    nextNumber++;
    groupMap[localId] = { id: synced.id, syncedTime: 0 };
  }

  const toLocal = new Map<string, string>([[NO_CONTAINER, NO_CONTAINER]]);
  for (const [cookieStoreId, id] of identityIds) toLocal.set(id, cookieStoreId);
  for (const [localId, meta] of Object.entries(groupMap)) toLocal.set(meta.id, localId);
  const toSynced = (member: string): string | undefined =>
    member == NO_CONTAINER ? NO_CONTAINER : isGroup(member) ? groupMap[member]?.id : identityIds.get(member);
  const syncedMembers = (group: SupergroupType) =>
    group.members.map(toSynced).filter((member): member is string => member !== undefined);

  // Take changes made elsewhere.
  const applied = new Set<string>();
  const assigned = new Set<string>();
  for (const [localId, meta] of Object.entries(groupMap)) {
    const group = local[localId] as SupergroupType;
    const synced = remote[meta.id];
    if (synced?.deletedTime != null) {
      if (localId == ROOT) continue;
      // Deleted elsewhere: its members move to the top level, as when deleting a group here.
      (local[ROOT] as SupergroupType).members.push(...group.members);
      delete local[localId];
      for (const other of Object.values(local)) other.members = other.members.filter((member) => member != localId);
      delete groupMap[localId];
      continue;
    }
    if (!synced || synced.updatedTime <= meta.syncedTime) continue;
    if (synced.name == group.name && sameMembers(synced.members, syncedMembers(group))) continue;
    const members = synced.members.flatMap((member) => {
      const localMember = toLocal.get(member);
      return localMember === undefined ? [] : [localMember];
    });
    const localOnly = group.members.filter((member) => toSynced(member) === undefined);
    if (localId != ROOT) group.name = synced.name;
    group.members = [...members, ...localOnly];
    for (const member of members) assigned.add(member);
    applied.add(localId);
    meta.syncedTime = now;
  }
  // Something is in one group only: a member another group just took leaves the others.
  for (const [localId, group] of Object.entries(local)) {
    if (!applied.has(localId)) group.members = group.members.filter((member) => !assigned.has(member));
  }

  // Send changes made here. Groups just updated from elsewhere wait for the next round,
  // so members not known here yet are not dropped from them.
  for (const [localId, meta] of Object.entries(groupMap)) {
    const group = local[localId];
    if (!group || applied.has(localId)) continue;
    const members = syncedMembers(group);
    const synced = remote[meta.id];
    if (synced && synced.name == group.name && sameMembers(synced.members, members)) continue;
    remote[meta.id] = { id: meta.id, name: group.name, members, updatedTime: now, deletedTime: null };
    meta.syncedTime = now;
  }
  return { local, remote, groupMap };
};
