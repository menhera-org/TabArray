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

import { StorageItem } from 'weeg-storage';
import { EventSink } from 'weeg-events';

import { ConfigurationOption } from './ConfigurationOption';

type StorageArea = 'local' | 'sync' | 'managed';

export class StorageConfigurationOption<T> implements ConfigurationOption<T> {
  private static readonly PREFIX = 'config.';

  private readonly managed: StorageItem<T>;
  private readonly local: StorageItem<T>;
  private readonly sync: StorageItem<T>;

  public readonly onChanged = new EventSink<T>();
  public readonly defaultArea: StorageArea;

  public constructor(key: string, defaultValue: T, defaultArea: StorageArea = 'sync') {
    this.managed = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageItem.AREA_MANAGED);
    this.local = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageItem.AREA_LOCAL);
    this.sync = new StorageItem<T>(StorageConfigurationOption.PREFIX + key, defaultValue, StorageItem.AREA_SYNC);
    this.defaultArea = defaultArea;

    this.observe((value) => {
      this.onChanged.dispatch(value);
    }, false);
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

  public async setValue(value: T, storageArea = this.defaultArea): Promise<void> {
    switch (storageArea) {
      case 'local': {
        await this.local.setValue(value);
        break;
      }

      case 'sync': {
        await this.sync.setValue(value);
        break;
      }

      default: {
        throw new Error(`Cannot set value for storage area: ${storageArea}`);
      }
    }
  }

  private observeManaged(observer: (value: T) => void) {
    this.managed.observe(async (managedValue) => {
      const hasValue = await this.managed.hasValue();
      if (hasValue) {
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
    this.local.observe(async (localValue) => {
      if (await this.managed.hasValue()) {
        observer(await this.managed.getValue());
        return;
      }

      const hasValue = await this.local.hasValue();
      if (hasValue) {
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

  public observe(observer: (value: T) => void, reportInitialValue = true) {
    if (reportInitialValue) {
      (async () => {
        const currentValue = await this.getValue();
        observer(currentValue);
      })();
    }

    this.observeManaged(observer);
    this.observeLocal(observer);
    this.observeSync(observer);
  }
}
