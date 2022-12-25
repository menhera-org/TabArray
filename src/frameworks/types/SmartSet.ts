// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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

export class SmartSet<T> implements Set<T> {
  public readonly getIdCallback: (item: T) => unknown;
  private readonly map = new Map<unknown, T>();

  public constructor(getIdCallback?: (item: T) => unknown, items?: Iterable<T>) {
    this.getIdCallback = getIdCallback ?? ((item: T) => item);
    if (null == items) return;
    for (const item of items) {
      this.add(item);
    }
  }

  public get [Symbol.toStringTag](): string {
    return 'SmartSet';
  }

  public getId(item: T): unknown {
    return this.getIdCallback(item);
  }

  public add(value: T): this {
    const id = this.getId(value);
    if (this.map.has(id)) return this;
    this.map.set(id, value);
    return this;
  }

  public clear(): void {
    this.map.clear();
  }

  public delete(value: T): boolean {
    const id = this.getId(value);
    return this.map.delete(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    this.map.forEach((value /*, key, map */) => {
      callbackfn(value, value, this);
    }, thisArg);
  }

  public has(value: T): boolean {
    const id = this.getId(value);
    return this.map.has(id);
  }

  public get size(): number {
    return this.map.size;
  }

  public *[Symbol.iterator](): IterableIterator<T> {
    for (const value of this.map.values()) {
      yield value;
    }
  }

  public *entries(): IterableIterator<[T, T]> {
    for (const value of this) {
      yield [value, value];
    }
  }

  public keys(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  public values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }
}
