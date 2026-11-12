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

import { DiscardCandidate, selectTabsToDiscard } from './selectTabsToDiscard';

const now = 10_000_000;
const old = (id: number, fields: Partial<DiscardCandidate> = {}): DiscardCandidate => ({
  id,
  url: 'https://example.com/',
  active: false,
  pinned: false,
  lastAccessed: now - 3600_000,
  ...fields,
});

test('frees old web pages, but not active, pinned, recent, non-web or kept-loaded tabs', () => {
  const tabs = [
    old(1),
    old(2, { active: true }),
    old(3, { pinned: true }),
    old(4, { lastAccessed: now - 60_000 }),
    old(5, { url: 'about:preferences' }),
    old(6, { discarded: true }),
    old(7, { autoDiscardable: false }),
    old(8),
  ];
  expect(selectTabsToDiscard(tabs, 900, now, new Set([8]))).toEqual([1]);
});
