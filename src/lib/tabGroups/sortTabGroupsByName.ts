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

import type { SupergroupStorageType } from './TabGroupDirectory';

const NO_CONTAINER = 'firefox-default';
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * The directory with the members of every container group sorted by name (#377), "No Container"
 * first, or null when it is already in that order. `nameOf` gives a container's or group's name.
 */
export const sortTabGroupsByName = (
  value: SupergroupStorageType,
  nameOf: (tabGroupId: string) => string
): SupergroupStorageType | null => {
  let changed = false;
  const sorted: SupergroupStorageType = {};
  for (const [tabGroupId, supergroup] of Object.entries(value)) {
    const members = [...supergroup.members].sort((a, b) => {
      if (a == NO_CONTAINER || b == NO_CONTAINER) return a == NO_CONTAINER ? -1 : b == NO_CONTAINER ? 1 : 0;
      return collator.compare(nameOf(a), nameOf(b));
    });
    if (members.some((member, i) => member != supergroup.members[i])) changed = true;
    sorted[tabGroupId] = { ...supergroup, members };
  }
  return changed ? sorted : null;
};
