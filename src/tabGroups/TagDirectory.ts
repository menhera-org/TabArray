// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { StorageItem } from "weeg-storage";
import { EventSink } from "weeg-events";

import { TagDirectorySnapshot } from "./TagDirectorySnapshot";

export type TagType = {
  tagId: number;
  name: string;
};

export type TagStorageType = {
  [tagId: number]: TagType;
};

export class TagDirectory {
  public readonly onChanged = new EventSink<void>();

  private readonly _storage = new StorageItem<TagStorageType>("tagDirectory", {}, StorageItem.AREA_LOCAL);

  public constructor() {
    this._storage.onChanged.addListener(() => this.onChanged.dispatch());
  }

  public async getValue(): Promise<TagStorageType> {
    return this._storage.getValue();
  }

  public async setValue(value: TagStorageType): Promise<void> {
    await this._storage.setValue(value);
  }

  public async getTags(): Promise<TagType[]> {
    const value = await this.getValue();
    return Object.values(value);
  }

  public async getTagIds(): Promise<number[]> {
    const value = await this.getValue();
    return Object.keys(value).map((key) => parseInt(key));
  }

  private async _getNewTagId(): Promise<number> {
    const tagIds = await this.getTagIds();
    return Math.max(...tagIds, 0) + 1;
  }

  public async getTag(tagId: number): Promise<TagType | undefined> {
    const value = await this.getValue();
    return value[tagId];
  }

  public async createTag(name: string): Promise<TagType> {
    const value = await this.getValue();
    const tagId = await this._getNewTagId();
    const tag = { tagId, name };
    value[tagId] = tag;
    await this.setValue(value);
    return tag;
  }

  public async renameTag(tagId: number, name: string): Promise<TagType> {
    const value = await this.getValue();
    const tag = value[tagId];
    if (!tag) throw new Error("Tag not found");
    tag.name = name;
    await this.setValue(value);
    return tag;
  }

  public async deleteTag(tagId: number): Promise<void> {
    const value = await this.getValue();
    delete value[tagId];
    await this.setValue(value);
  }

  public async getSnapshot(): Promise<TagDirectorySnapshot> {
    const value = await this.getValue();
    return new TagDirectorySnapshot(value);
  }
}
