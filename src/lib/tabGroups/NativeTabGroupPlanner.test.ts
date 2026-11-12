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

import { fromGroupColor, planWindow, PlannerContainer, PlannerTab, toGroupColor } from './NativeTabGroupPlanner';

const A = 'firefox-container-1';
const B = 'firefox-container-2';
const D = 'firefox-default';
const containers = new Map<string, PlannerContainer>([
  [A, { name: 'Work', color: 'blue' }],
  [B, { name: 'Shopping', color: 'pink' }],
]);
let nextIndex = 0;
const tab = (id: number, cookieStoreId: string, groupId = -1, pinned = false): PlannerTab => ({
  id,
  index: nextIndex++,
  pinned,
  cookieStoreId,
  groupId,
});
const work = { id: 10, title: 'Work', color: 'blue' };
const shopping = { id: 20, title: 'Shopping', color: 'pink' };

test('a window without groups gets one new group per container, and tabs with no container stay out', () => {
  nextIndex = 0;
  const tabs = [tab(1, D), tab(2, A), tab(3, B), tab(4, A)];
  expect(planWindow(tabs, [], containers)).toEqual([
    { type: 'group', cookieStoreId: A, tabIds: [2, 4] },
    { type: 'group', cookieStoreId: B, tabIds: [3] },
  ]);
});

test('groups that already match need nothing; a stale title or color is updated', () => {
  nextIndex = 0;
  const tabs = [tab(1, A, 10), tab(2, A, 10), tab(3, B, 20)];
  expect(planWindow(tabs, [work, shopping], containers)).toEqual([]);
  expect(planWindow(tabs, [{ ...work, title: 'Old', color: 'red' }, shopping], containers)).toEqual([
    { type: 'update', groupId: 10, title: 'Work', color: 'blue' },
  ]);
});

test('a tab dragged out goes back, and a tab with no container dropped in comes out', () => {
  nextIndex = 0;
  const tabs = [tab(1, A, 10), tab(2, D, 10), tab(3, A), tab(4, D)];
  expect(planWindow(tabs, [work], containers)).toEqual([
    { type: 'ungroup', tabIds: [2] },
    { type: 'group', cookieStoreId: A, tabIds: [3], groupId: 10 },
  ]);
});

test('a hand-made group spanning containers is split, and each container keeps the group with most of its tabs', () => {
  nextIndex = 0;
  // Work holds 1 and 2; the user grouped Work tab 3 with Shopping tab 4 in group 30.
  const tabs = [tab(1, A, 10), tab(2, A, 10), tab(3, A, 30), tab(4, B, 30)];
  const handMade = { id: 30, title: '', color: 'green' };
  expect(planWindow(tabs, [work, handMade], containers)).toEqual([
    { type: 'group', cookieStoreId: A, tabIds: [3], groupId: 10 },
    { type: 'update', groupId: 30, title: 'Shopping', color: 'pink' },
  ]);
});

test('when two containers share a group equally, the one whose tabs come first keeps it', () => {
  nextIndex = 0;
  const tabs = [tab(1, B, 30), tab(2, A, 30)];
  expect(planWindow(tabs, [{ id: 30, title: 'Shopping', color: 'pink' }], containers)).toEqual([
    { type: 'group', cookieStoreId: A, tabIds: [2] },
  ]);
});

test('pinned tabs and groups of tabs with no container are left alone', () => {
  nextIndex = 0;
  const tabs = [tab(1, A, -1, true), tab(2, D, 40), tab(3, D, 40)];
  expect(planWindow(tabs, [{ id: 40, title: 'Reading', color: 'red' }], containers)).toEqual([]);
});

test('container colors map to group colors and back, keeping violet and either gray name', () => {
  expect(['violet', 'gray', 'toolbar', 'cyan', 'turquoise'].map(toGroupColor)).toEqual([
    'purple',
    'grey',
    'grey',
    'cyan',
    'cyan',
  ]);
  expect(fromGroupColor('purple', 'violet')).toBeUndefined();
  expect(fromGroupColor('grey', 'gray')).toBeUndefined();
  expect(fromGroupColor('grey', 'blue')).toBe('toolbar');
  expect(fromGroupColor('cyan', 'blue')).toBe('turquoise');
  expect(fromGroupColor('red', 'blue')).toBe('red');
});
