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

import { StorageItem } from 'weeg-storage';
import { PromiseUtils } from 'weeg-utils';

import { Uint32 } from "weeg-types";
import { UserContext } from '../frameworks/tabGroups';
import { UserContextSortingProvider } from '../frameworks/tabGroups';
import { EventSink } from "weeg-events";

export class UserContextSortingOrderStore {
  private static readonly STORAGE_KEY = 'userContextSortingOrder';

  private static readonly INSTANCE = new UserContextSortingOrderStore();

  public static getInstance(): UserContextSortingOrderStore {
    return UserContextSortingOrderStore.INSTANCE;
  }

  private readonly storageItem: StorageItem<Uint32.Uint32[]>;
  private readonly sortingProvider = new UserContextSortingProvider();
  private readonly initializationPromise = PromiseUtils.createPromise<void>();

  public readonly onChanged = new EventSink<void>();

  private constructor() {
    this.storageItem = new StorageItem(UserContextSortingOrderStore.STORAGE_KEY, [], StorageItem.AREA_LOCAL);
    this.storageItem.observe((newValue) => {
      this.sortingProvider.setOrder(newValue);
      this.initializationPromise.resolve();
      this.onChanged.dispatch();
    });
  }

  public async setOrder(order: Uint32.Uint32[]): Promise<void> {
    this.sortingProvider.setOrder(order);
    await this.storageItem.setValue(order);
  }

  public async getOrder(): Promise<Uint32.Uint32[]> {
    return this.sortingProvider.getOrder();
  }

  public sort(userContexts: UserContext[]): UserContext[] {
    return this.sortingProvider.sort(userContexts);
  }

  public sortingCallback(a: Uint32.Uint32, b: Uint32.Uint32): number {
    return this.sortingProvider.sortingCallback(a, b);
  }

  public get initialized(): Promise<void> {
    return this.initializationPromise.promise;
  }
}
