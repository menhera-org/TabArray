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

export type DiscardCandidate = {
  id?: number;
  url?: string;
  discarded?: boolean;
  active: boolean;
  pinned: boolean;
  lastAccessed?: number;
  autoDiscardable?: boolean;
};

/**
 * The web pages unused for at least `minAgeSeconds` that may be freed from memory. Active and pinned
 * tabs, and tabs kept loaded (`autoDiscardable: false` or in `keptTabIds`, #282), stay loaded.
 */
export const selectTabsToDiscard = (
  tabs: readonly DiscardCandidate[],
  minAgeSeconds: number,
  now: number,
  keptTabIds: ReadonlySet<number> = new Set()
): number[] =>
  tabs
    .filter(
      (tab) =>
        tab.id != null &&
        /^https?:/.test(tab.url ?? '') &&
        !tab.discarded &&
        !tab.active &&
        !tab.pinned &&
        tab.autoDiscardable !== false &&
        !keptTabIds.has(tab.id) &&
        tab.lastAccessed != null &&
        tab.lastAccessed + minAgeSeconds * 1000 < now
    )
    .map((tab) => tab.id as number);
