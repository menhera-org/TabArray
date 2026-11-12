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

import { container } from '../../test/fixtures';
import { findLeftoverTemporaryContainers } from './TemporaryContainerService';

test('leftover temporary containers are tmp-<userContextId> [(group)] containers with no tab in any window', () => {
  const containers = [
    container('firefox-container-5', 'tmp-5'), // no tabs: leftover
    container('firefox-container-6', 'tmp-6'), // only a pinned tab in another window
    container('firefox-container-7', 'tmp-9'), // number does not match its userContextId
    container('firefox-container-8', 'tmp-8 work'),
    container('firefox-container-10', 'Work'),
    container('firefox-container-11', 'tmp-11 (Work (old))'), // made inside a group: leftover
    container('firefox-container-12', 'tmp-12 (Work)'), // has a tab
    container('firefox-container-13', 'tmp-1 (Work)'), // number does not match
    container('firefox-container-14', 'tmp-14 (Work'),
  ];
  const tabs = [
    { cookieStoreId: 'firefox-default' },
    { cookieStoreId: 'firefox-container-6' },
    { cookieStoreId: 'firefox-container-12' },
  ];
  expect(findLeftoverTemporaryContainers(containers, tabs).map((c) => c.name)).toEqual([
    'tmp-5',
    'tmp-11 (Work (old))',
  ]);
});
