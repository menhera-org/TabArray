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
  Decides how one window's native tab groups must change so that each container's tabs form
  exactly one group. No side effects, so the rules can be tested without a browser.
*/

export type GroupColor = 'blue' | 'cyan' | 'grey' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow';

export const TAB_GROUP_ID_NONE = -1;

export type PlannerTab = {
  id: number;
  index: number;
  pinned: boolean;
  cookieStoreId: string;
  groupId: number;
};

export type PlannerGroup = {
  id: number;
  title: string;
  color: string;
};

/** A container that gets a group: its name and its color as a group color. */
export type PlannerContainer = {
  name: string;
  color: GroupColor;
};

export type PlannerAction =
  | { type: 'ungroup'; tabIds: number[] }
  /** Into `groupId`, or into a new group for the container when it has none. */
  | { type: 'group'; cookieStoreId: string; tabIds: number[]; groupId?: number }
  | { type: 'update'; groupId: number; title: string; color: GroupColor };

// Container colors by both their pre-153 and Firefox 153 names. Groups have no violet.
const GROUP_COLORS: Record<string, GroupColor> = {
  blue: 'blue',
  turquoise: 'cyan',
  cyan: 'cyan',
  green: 'green',
  yellow: 'yellow',
  orange: 'orange',
  red: 'red',
  pink: 'pink',
  purple: 'purple',
  violet: 'purple',
  toolbar: 'grey',
  gray: 'grey',
};

export const toGroupColor = (containerColor: string): GroupColor => GROUP_COLORS[containerColor] ?? 'grey';

/**
 * The container color for a group color, in the pre-153 names every supported Firefox accepts,
 * or undefined when the container's color already maps to it (so violet stays violet).
 */
export const fromGroupColor = (groupColor: string, containerColor: string): string | undefined => {
  if (toGroupColor(containerColor) == groupColor) return undefined;
  switch (groupColor) {
    case 'grey':
      return 'toolbar';
    case 'cyan':
      return 'turquoise';
    default:
      return groupColor;
  }
};

/**
 * The changes that give each container with tabs in the window one group of its own.
 * `containers` holds the containers that get groups; tabs of any other cookie store (no container)
 * stay outside container groups. Pinned tabs are never grouped.
 */
export const planWindow = (
  tabs: readonly PlannerTab[],
  groups: readonly PlannerGroup[],
  containers: ReadonlyMap<string, PlannerContainer>
): PlannerAction[] => {
  const sortedTabs = [...tabs].sort((a, b) => a.index - b.index);
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const containerTabs = new Map<string, PlannerTab[]>();
  for (const tab of sortedTabs) {
    if (tab.pinned || !containers.has(tab.cookieStoreId)) continue;
    let list = containerTabs.get(tab.cookieStoreId);
    if (!list) containerTabs.set(tab.cookieStoreId, (list = []));
    list.push(tab);
  }

  // Each container keeps the group holding most of its tabs, unless a container with more tabs there took it.
  const candidates: { cookieStoreId: string; groupId: number; count: number; firstIndex: number }[] = [];
  for (const [cookieStoreId, list] of containerTabs) {
    const counts = new Map<number, { count: number; firstIndex: number }>();
    for (const tab of list) {
      if (tab.groupId == TAB_GROUP_ID_NONE || !groupsById.has(tab.groupId)) continue;
      const entry = counts.get(tab.groupId);
      if (entry) entry.count++;
      else counts.set(tab.groupId, { count: 1, firstIndex: tab.index });
    }
    for (const [groupId, { count, firstIndex }] of counts) {
      candidates.push({ cookieStoreId, groupId, count, firstIndex });
    }
  }
  candidates.sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex);
  const groupOfContainer = new Map<string, number>();
  const containerOfGroup = new Map<number, string>();
  for (const { cookieStoreId, groupId } of candidates) {
    if (groupOfContainer.has(cookieStoreId) || containerOfGroup.has(groupId)) continue;
    groupOfContainer.set(cookieStoreId, groupId);
    containerOfGroup.set(groupId, cookieStoreId);
  }

  const actions: PlannerAction[] = [];

  // Tabs with no container (and pinned tabs) leave groups that hold container tabs.
  const ungroupIds = sortedTabs
    .filter((tab) => !containerTabs.get(tab.cookieStoreId)?.includes(tab) && containerOfGroup.has(tab.groupId))
    .map((tab) => tab.id);
  if (ungroupIds.length > 0) actions.push({ type: 'ungroup', tabIds: ungroupIds });

  for (const [cookieStoreId, list] of containerTabs) {
    const container = containers.get(cookieStoreId) as PlannerContainer;
    const groupId = groupOfContainer.get(cookieStoreId);
    const outside = list.filter((tab) => tab.groupId != groupId).map((tab) => tab.id);
    if (groupId === undefined) {
      actions.push({ type: 'group', cookieStoreId, tabIds: outside });
      continue;
    }
    if (outside.length > 0) actions.push({ type: 'group', cookieStoreId, tabIds: outside, groupId });
    const group = groupsById.get(groupId) as PlannerGroup;
    if (group.title != container.name || group.color != container.color) {
      actions.push({ type: 'update', groupId, title: container.name, color: container.color });
    }
  }
  return actions;
};
