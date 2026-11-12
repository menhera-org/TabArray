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

import { sortTabGroupsByName } from './sortTabGroupsByName';

const names: Record<string, string> = {
  'firefox-container-1': 'work',
  'firefox-container-2': 'Banking',
  'firefox-container-3': 'Shop 10',
  'firefox-container-4': 'Shop 9',
  'tabarray-supergroup-1': 'Jobs',
};
const nameOf = (id: string) => names[id] ?? '';

test('sorts each group by name, ignoring case and comparing numbers, with No Container first', () => {
  const value = {
    'tabarray-supergroup-0': {
      supergroupId: 0,
      name: '',
      members: ['firefox-container-1', 'tabarray-supergroup-1', 'firefox-default', 'firefox-container-2'],
    },
    'tabarray-supergroup-1': {
      supergroupId: 1,
      name: 'Jobs',
      members: ['firefox-container-3', 'firefox-container-4'],
    },
  };
  const sorted = sortTabGroupsByName(value, nameOf);
  expect(sorted?.['tabarray-supergroup-0']?.members).toEqual([
    'firefox-default',
    'firefox-container-2',
    'tabarray-supergroup-1',
    'firefox-container-1',
  ]);
  expect(sorted?.['tabarray-supergroup-1']?.members).toEqual(['firefox-container-4', 'firefox-container-3']);
  expect(sortTabGroupsByName(sorted ?? {}, nameOf)).toBeNull();
});
