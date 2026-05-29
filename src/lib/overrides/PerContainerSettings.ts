/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

/**
 * Per-container settings.
 */
export interface PerContainerSettings<T> {
  /**
   * Returns per-container setting for the given tab group.
   */
  getValueForTabGroup(tabGroupId: string): Promise<T | undefined>;

  /**
   * Sets per-container setting for the given tab group.
   */
  setValueForTabGroup(tabGroupId: string, value: T): Promise<void>;

  /**
   * Removes per-container setting for the given tab group.
   */
  removeTabGroup(tabGroupId: string): Promise<void>;
}
