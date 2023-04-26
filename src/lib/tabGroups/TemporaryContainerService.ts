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

import browser from 'webextension-polyfill';
import { StorageItem } from 'weeg-storage';
import { ContextualIdentity } from 'weeg-containers';

import { ServiceRegistry } from '../ServiceRegistry';
import { ContextualIdentityService } from './ContextualIdentityService';
import { TabGroupService } from './TabGroupService';
import { CompatConsole } from '../console/CompatConsole';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class TemporaryContainerService {
  private static readonly _INSTANCE = new TemporaryContainerService();

  public static getInstance(): TemporaryContainerService {
    return this._INSTANCE;
  }

  private readonly _tabGroupService = TabGroupService.getInstance();
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _contextualIdentityFactory = this._contextualIdentityService.getFactory();
  private readonly _temporaryContainerStorage = new StorageItem<string[]>('temporaryContainers', [], StorageItem.AREA_LOCAL);

  private constructor() {
    // noop.
  }

  public async removeTemporaryContainerFromList(cookieStoreId: string): Promise<void> {
    const temporaryContainers = await this._temporaryContainerStorage.getValue();
    if (temporaryContainers.includes(cookieStoreId)) {
      temporaryContainers.splice(temporaryContainers.indexOf(cookieStoreId), 1);
      await this._temporaryContainerStorage.setValue(temporaryContainers);
    }
  }

  public async removeTemporaryContainer(cookieStoreId: string): Promise<void> {
    this.removeTemporaryContainerFromList(cookieStoreId);
    await this._tabGroupService.removeBrowsingDataForTabGroupId(cookieStoreId);
    await this._contextualIdentityFactory.remove(cookieStoreId);
    console.debug('Removed temporary container', cookieStoreId);
  }

  public async isTemporaryContainer(cookieStoreId: string): Promise<boolean> {
    const temporaryContainers = await this._temporaryContainerStorage.getValue();
    return temporaryContainers.includes(cookieStoreId);
  }

  private getRandomColor(): string {
    const colors = ['blue', 'turquoise', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'toolbar'];
    return colors[Math.floor(Math.random() * colors.length)] ?? 'blue';
  }

  public async createTemporaryContainer(): Promise<ContextualIdentity> {
    let identity = await this._contextualIdentityFactory.create({
      name: '__tmp__',
      color: this.getRandomColor(),
      icon: 'fingerprint',
    });

    identity = await this._contextualIdentityFactory.setParams(identity.cookieStore.id, {
      name: `tmp-${identity.cookieStore.userContextId.toFixed(0)}`,
      color: identity.color,
      icon: identity.icon,
    });

    await browser.tabs.create({
      cookieStoreId: identity.cookieStore.id,
      windowId: browser.windows.WINDOW_ID_CURRENT,
    });

    const temporaryContainers = await this._temporaryContainerStorage.getValue();
    temporaryContainers.push(identity.cookieStore.id);
    await this._temporaryContainerStorage.setValue(temporaryContainers);

    console.info('Created temporary container:', identity.cookieStore.id, identity.name);
    return identity;
  }
}

ServiceRegistry.getInstance().registerService('TemporaryContainerService', TemporaryContainerService.getInstance());
