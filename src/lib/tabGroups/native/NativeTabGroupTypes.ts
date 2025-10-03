/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2024 Menhera.org

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

export type NativeTabGroupId = number;

export interface NativeTabGroup {
  id: NativeTabGroupId;
  title?: string;
  color?: string;
  collapsed?: boolean;
  windowId: number;
}

export interface NativeTabGroupQueryInfo {
  windowId?: number;
}

export interface NativeTabGroupCreateInfo {
  windowId?: number;
  index?: number;
  title?: string;
  color?: string;
  tabIds: number[];
}

export interface NativeTabGroupUpdateInfo {
  title?: string;
  color?: string;
  collapsed?: boolean;
}

export interface NativeTabGroupMoveInfo {
  windowId?: number;
  index: number;
}

export interface WebExtEvent<T extends (...args: unknown[]) => unknown> {
  addListener(listener: T): void;
  removeListener(listener: T): void;
  hasListener(listener: T): boolean;
}

export interface NativeTabGroupsNamespace {
  query(queryInfo?: NativeTabGroupQueryInfo): Promise<NativeTabGroup[]>;
  get(groupId: NativeTabGroupId): Promise<NativeTabGroup>;
  update(groupId: NativeTabGroupId, updateInfo: NativeTabGroupUpdateInfo): Promise<NativeTabGroup>;
  move(groupId: NativeTabGroupId, moveInfo: NativeTabGroupMoveInfo): Promise<NativeTabGroup>;
  remove(groupId: NativeTabGroupId): Promise<void>;
  onCreated: WebExtEvent<(group: NativeTabGroup) => void>;
  onUpdated: WebExtEvent<(group: NativeTabGroup) => void>;
  onMoved: WebExtEvent<(group: NativeTabGroup) => void>;
  onRemoved: WebExtEvent<(group: NativeTabGroup) => void>;
}
