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

import { ExtensibleAttribute, ExtensibleAttributeSet } from "weeg-utils";
import { CompatTab, TabAttributeProvider } from "weeg-tabs";

import { TagDirectory, TagType } from "./TagDirectory";
import { TagDirectorySnapshot } from "./TagDirectorySnapshot";

/**
 * Snapshot of attributes for given tabs.
 */
export class TabAttributeMap {
  public static readonly ATTR_TAG_ID = new ExtensibleAttribute<number>('tagId');

  private static readonly _tabAttributeProvider = new TabAttributeProvider();
  private static readonly _tagDirectory = new TagDirectory();

  private readonly _attributeSetMap = new Map<number, ExtensibleAttributeSet<CompatTab>>();
  private readonly _snapshot: TagDirectorySnapshot;
  private readonly _tabIds: number[] = [];

  public static async create(tabs: Iterable<CompatTab>): Promise<TabAttributeMap> {
    const [attributesSets, snapshot] = await Promise.all([
      this._tabAttributeProvider.getAttributeSets(tabs),
      this._tagDirectory.getSnapshot(),
    ]);
    return new TabAttributeMap(attributesSets, snapshot);
  }

  private constructor(attributeSets: ExtensibleAttributeSet<CompatTab>[], snapshot: TagDirectorySnapshot) {
    this._snapshot = snapshot;
    for (const attributeSet of attributeSets) {
      const tabId = attributeSet.target.id;
      this._tabIds.push(tabId);
      this._attributeSetMap.set(tabId, attributeSet);
    }
  }

  public getTabIds(): number[] {
    return this._tabIds;
  }

  public getTab(tabId: number): CompatTab | undefined {
    const attributeSet = this._attributeSetMap.get(tabId);
    if (attributeSet == null) return undefined;
    return attributeSet.target;
  }

  public getAttribute<T>(tabId: number, attribute: ExtensibleAttribute<T>): T | undefined {
    const attributeSet = this._attributeSetMap.get(tabId);
    if (attributeSet == null) return undefined;
    return attributeSet.getAttribute(attribute);
  }

  public getTagIdForTab(tabId: number): number | undefined {
    return this.getAttribute(tabId, TabAttributeMap.ATTR_TAG_ID);
  }

  public getTagForTab(tabId: number): TagType | undefined {
    const tagId = this.getTagIdForTab(tabId);
    if (tagId == null) return undefined;
    return this._snapshot.getTag(tagId);
  }

  public getTagDirectorySnapshot(): TagDirectorySnapshot {
    return this._snapshot;
  }
}
