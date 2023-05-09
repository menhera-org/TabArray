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

import { TagType, TagStorageType } from "./TagType";

export class TagDirectorySnapshot {
  private readonly _value: TagStorageType;

  public constructor(value: TagStorageType) {
    this._value = value;
  }

  public getValue(): TagStorageType {
    return structuredClone(this._value);
  }

  public getTags(): TagType[] {
    const value = this.getValue();
    return Object.values(value);
  }

  public getTagIds(): number[] {
    const value = this.getValue();
    return Object.keys(value).map((key) => parseInt(key));
  }

  public getTag(tagId: number): TagType | undefined {
    const value = this.getValue();
    return value[tagId];
  }
}
