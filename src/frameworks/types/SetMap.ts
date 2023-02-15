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

import { SmartSet } from "./SmartSet";

export class SetMap<K,V> implements Map<K, ReadonlySet<V>> {
  private readonly map: Map<K, Set<V>>;
  private readonly getIdCallback?: (item: V) => unknown;

  public constructor(getIdCallback?: (item: V) => unknown) {
    this.map = new Map();
    this.getIdCallback = getIdCallback;
  }

  public get size(): number {
    return this.map.size;
  }

  /**
   * Total number of items in the sets.
   */
  public get itemCount(): number {
    let count = 0;
    for (const set of this.map.values()) {
      count += set.size;
    }
    return count;
  }

  /**
   * Adds an item to the set associated with the key.
   * @param key
   * @param value
   * @returns the SetMap instance, for chaining.
   */
  public addItem(key: K, value: V): this {
    let set = this.map.get(key);
    if (null == set) {
      set = new SmartSet(this.getIdCallback);
      this.map.set(key, set);
    }
    set.add(value);
    return this;
  }

  /**
   * Deletes an item from the set associated with the key.
   * @param key
   * @param value
   * @returns if the item was deleted.
   */
  public deleteItem(key: K, value: V): boolean {
    const set = this.map.get(key);
    if (null == set) return false;
    const result = set.delete(value);
    if (0 === set.size) {
      this.map.delete(key);
    }
    return result;
  }

  public clear(): void {
    this.map.clear();
  }

  public get(key: K): ReadonlySet<V> | undefined {
    return this.map.get(key);
  }

  public set(key: K, value: ReadonlySet<V>): this {
    this.map.set(key, new SmartSet(this.getIdCallback, value));
    return this;
  }

  public has(key: K): boolean {
    return this.map.has(key);
  }

  public delete(key: K): boolean {
    return this.map.delete(key);
  }

  public forEach(callbackfn: (value: ReadonlySet<V>, key: K, map: Map<K, ReadonlySet<V>>) => void, thisArg?: unknown): void {
    this.map.forEach(callbackfn, thisArg);
  }

  public entries(): IterableIterator<[K, ReadonlySet<V>]> {
    return this.map.entries();
  }

  public keys(): IterableIterator<K> {
    return this.map.keys();
  }

  public values(): IterableIterator<ReadonlySet<V>> {
    return this.map.values();
  }

  public [Symbol.iterator](): IterableIterator<[K, ReadonlySet<V>]> {
    return this.map[Symbol.iterator]();
  }

  public get [Symbol.toStringTag](): string {
    return 'SetMap';
  }
}
