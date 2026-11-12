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
import { getContainerInfos } from './PageActionApp';

const work = container('firefox-container-1', 'Work');

test('offers no container, the containers, and private browsing when allowed, but not the current one', () => {
  expect(getContainerInfos([work], true, 'firefox-default').map((i) => i.name)).toEqual(['Work', 'privateBrowsing']);
  expect(getContainerInfos([work], false, 'firefox-container-1').map((i) => [i.name, i.iconUrl])).toEqual([
    ['noContainer', ''],
  ]);
});
