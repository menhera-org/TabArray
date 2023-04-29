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

import { StorageItem } from "weeg-storage";


export class SetStorage<T> {
  private readonly _storage: StorageItem<T[]>;

  public constructor(key: string) {
    this._storage = new StorageItem<T[]>(key, [], StorageItem.AREA_LOCAL);
  }

  public async getSize(): Promise<number> {
    const value = await this._storage.getValue();
    return value.length;
  }

  public async clear(): Promise<void> {
    await this._storage.setValue([]);
  }

  public async add(value: T): Promise<void> {
    const values = await this._storage.getValue();
    if (values.includes(value)) return;
    values.push(value);
    await this._storage.setValue(values);
  }

  public async delete(value: T): Promise<boolean> {
    const values = await this._storage.getValue();
    const index = values.indexOf(value);
    if (index < 0) return false;
    values.splice(index, 1);
    await this._storage.setValue(values);
    return true;
  }

  public async values(): Promise<IterableIterator<T>> {
    const values = await this._storage.getValue();
    return values.values();
  }

  public async keys(): Promise<IterableIterator<T>> {
    return this.values();
  }

  public async has(value: T): Promise<boolean> {
    const values = await this._storage.getValue();
    return values.includes(value);
  }

  public async entries(): Promise<IterableIterator<[T, T]>> {
    const values = await this._storage.getValue();
    return values.map((a) => [a, a] as [T, T]).values();
  }

  public async forEach(callbackfn: (value: T, value2: T, set: SetStorage<T>) => void, thisArg?: unknown): Promise<void> {
    const values = await this._storage.getValue();
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }
    values.forEach((value) => {
      callbackfn(value, value, this);
    });
  }
}
