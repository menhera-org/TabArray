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

import { BackgroundService } from "weeg-utils";
import { CookieStore } from "weeg-containers";

import { CachedStorageItem } from "../storage/CachedStorageItem";
import { ContextualIdentityService } from "../tabGroups/ContextualIdentityService";

import { ServiceRegistry } from "../ServiceRegistry";

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();

export class ContainerHistoryService extends BackgroundService<string, void> {
  private readonly _storage = new CachedStorageItem<string[]>('containerHistory', [], CachedStorageItem.AREA_LOCAL);

  public override getServiceName(): string {
    return 'ContainerHistoryService';
  }

  protected override initializeBackground(): void {
    contextualIdentityFactory.onRemoved.addListener((contextualIdentity) => {
      const cookieStoreId = contextualIdentity.cookieStore.id;
      this._storage.doUpdateTransaction((history) => {
        return history.filter((cookieStoreIdInHistory) => {
          return cookieStoreIdInHistory !== cookieStoreId;
        });
      });
    })
  }

  protected override async execute(cookieStoreId: string): Promise<void> {
    if (cookieStoreId == CookieStore.PRIVATE.id) return;
    this._storage.doUpdateTransaction((history) => {
      history = history.filter((cookieStoreIdInHistory) => {
        return cookieStoreIdInHistory !== cookieStoreId;
      });
      history.push(cookieStoreId);
      return history;
    });
  }

  public addHistoryEntry(cookieStoreId: string): void {
    this.call(cookieStoreId).catch((e) => {
      console.error(e);
    });
  }

  public getHistory(): Promise<string[]> {
    return this._storage.getValue(true);
  }
}

ServiceRegistry.getInstance().registerService('ContainerHistoryService', ContainerHistoryService.getInstance<ContainerHistoryService>());
