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

import { expect, test } from 'vitest';

import { GroupSyncState, reconcileGroups } from './reconcileGroups';

const D = 'firefox-default';
const ROOT = 'tabarray-supergroup-0';
let counter = 0;
const newId = () => `g${++counter}`;

// Device A: Work (A) at the top level, Shopping (B) in "Jobs".
const deviceA = (): GroupSyncState => ({
  local: {
    [ROOT]: { supergroupId: 0, name: '', members: [D, 'firefox-container-1', 'tabarray-supergroup-1'] },
    'tabarray-supergroup-1': { supergroupId: 1, name: 'Jobs', members: ['firefox-container-2'] },
  },
  remote: {},
  groupMap: {},
});
const idsA = new Map([
  ['firefox-container-1', 'A'],
  ['firefox-container-2', 'B'],
]);

test('the first sync sends every group, members by synced IDs', () => {
  counter = 0;
  const { remote } = reconcileGroups(deviceA(), idsA, 1000, newId);
  expect(remote['root']?.members).toEqual([D, 'A', 'g1']);
  expect(remote['g1']).toMatchObject({ name: 'Jobs', members: ['B'], deletedTime: null });
});

test('another device takes the groups, with its own container IDs, and keeps containers that do not sync', () => {
  counter = 0;
  const synced = reconcileGroups(deviceA(), idsA, 1000, newId).remote;
  const deviceB: GroupSyncState = {
    local: {
      [ROOT]: {
        supergroupId: 0,
        name: '',
        members: [D, 'firefox-container-5', 'firefox-container-6', 'firefox-container-9'],
      },
    },
    remote: synced,
    groupMap: {},
  };
  const idsB = new Map([
    ['firefox-container-5', 'A'],
    ['firefox-container-6', 'B'],
  ]); // container 9 is temporary
  const { local } = reconcileGroups(deviceB, idsB, 2000, newId);
  expect(local['tabarray-supergroup-1']).toEqual({ supergroupId: 1, name: 'Jobs', members: ['firefox-container-6'] });
  expect(local[ROOT]?.members).toEqual([D, 'firefox-container-5', 'tabarray-supergroup-1', 'firefox-container-9']);
});

test('a rename elsewhere comes here, and a deletion here is sent', () => {
  counter = 0;
  const first = reconcileGroups(deviceA(), idsA, 1000, newId);
  (first.remote['g1'] as { name: string; updatedTime: number }).name = 'Work stuff';
  (first.remote['g1'] as { updatedTime: number }).updatedTime = 1500;
  const second = reconcileGroups(first, idsA, 2000, newId);
  expect(second.local['tabarray-supergroup-1']?.name).toBe('Work stuff');

  delete second.local['tabarray-supergroup-1'];
  const third = reconcileGroups(second, idsA, 3000, newId);
  expect(third.remote['g1']?.deletedTime).toBe(3000);
  expect(third.groupMap['tabarray-supergroup-1']).toBeUndefined();
});

test('a group deleted elsewhere is deleted here, its members moving to the top level', () => {
  counter = 0;
  const first = reconcileGroups(deviceA(), idsA, 1000, newId);
  (first.remote['g1'] as { deletedTime: number | null }).deletedTime = 1500;
  const { local } = reconcileGroups(first, idsA, 2000, newId);
  expect(local['tabarray-supergroup-1']).toBeUndefined();
  expect(local[ROOT]?.members).toEqual([D, 'firefox-container-1', 'firefox-container-2']);
});
