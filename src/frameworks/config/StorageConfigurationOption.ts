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

import { StorageItem } from '../storage';
import { StorageArea } from '../storage';
import { ConfigurationOption } from './ConfigurationOption';

export class StorageConfigurationOption<T> implements ConfigurationOption<T> {
  private static readonly PREFIX = 'config.';

  private readonly managed: StorageItem<T>;
  private readonly local: StorageItem<T>;
  private readonly sync: StorageItem<T>;

  public constructor(key: string, defaultValue: T) {
    this.managed = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageArea.MANAGED);
    this.local = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageArea.LOCAL);
    this.sync = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageArea.SYNC);
  }

  public async getValue(): Promise<T> {
    if (await this.managed.hasValue()) {
      return await this.managed.getValue();
    }
    if (await this.local.hasValue()) {
      return await this.local.getValue();
    }
    return await this.sync.getValue();
  }

  public async setValue(value: T, storageArea = StorageArea.SYNC): Promise<void> {
    switch (storageArea) {
      case StorageArea.LOCAL: {
        await this.local.setValue(value);
        break;
      }

      case StorageArea.SYNC: {
        await this.sync.setValue(value);
        break;
      }

      default: {
        throw new Error(`Cannot set value for storage area: ${storageArea}`);
      }
    }
  }

  private observeManaged(observer: (value: T) => void) {
    this.managed.observeMaybe(async (managedValue) => {
      if (managedValue !== undefined) {
        observer(managedValue);
        return;
      }

      if (await this.local.hasValue()) {
        observer(await this.local.getValue());
        return;
      }

      observer(await this.sync.getValue());
    }, false);
  }

  private observeLocal(observer: (value: T) => void) {
    this.local.observeMaybe(async (localValue) => {
      if (await this.managed.hasValue()) {
        observer(await this.managed.getValue());
        return;
      }

      if (localValue !== undefined) {
        observer(localValue);
        return;
      }

      observer(await this.sync.getValue());
    }, false);
  }

  private observeSync(observer: (value: T) => void) {
    this.sync.observe(async (syncValue) => {
      if (await this.managed.hasValue()) {
        observer(await this.managed.getValue());
        return;
      }

      if (await this.local.hasValue()) {
        observer(await this.local.getValue());
        return;
      }

      observer(syncValue);
    }, false);
  }

  public observe(observer: (value: T) => void) {
    (async () => {
      const currentValue = await this.getValue();
      observer(currentValue);
    })();

    this.observeManaged(observer);
    this.observeLocal(observer);
    this.observeSync(observer);
  }
}
