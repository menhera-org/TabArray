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
import { EventSink } from "weeg-events";
import { Asserts } from "weeg-utils";

import { ProxyType } from "./ProxyType";
import { ProxyPreset, ProxyPresetParams } from "./ProxyPreset";
import { RandomIdService } from "../RandomIdService";

type StorageType = Record<string, ProxyPreset>;

const randomIdService = RandomIdService.getInstance();

export class ProxyPresetStore {
  public readonly onChanged = new EventSink<void>();

  private readonly _storage = new StorageItem<StorageType>('proxyPresets', {}, StorageItem.AREA_LOCAL);

  public constructor() {
    Asserts.assertTopLevelInBackgroundScript();
    this._storage.onChanged.addListener(() => {
      this.onChanged.dispatch();
    });
  }
  private async getValue(): Promise<StorageType> {
    return await this._storage.getValue();
  }

  private async setValue(value: StorageType): Promise<void> {
    await this._storage.setValue(value);
  }

  private buildProxyPreset(params: ProxyPresetParams, preset?: ProxyPreset): ProxyPreset {
    const title = params.title?.trim() ?? '';
    const type = ProxyType.fromString(params.type);
    const host = params.host.trim();
    const port = parseInt(params.port.toString().trim(), 10);
    if (isNaN(port)) {
      throw new Error('Invalid port');
    }
    const username = params.username || undefined;
    const password = params.password || undefined;
    const proxyDns = params.proxyDns != null ? !!params.proxyDns : undefined;
    const doNotProxyLocal = params.doNotProxyLocal != null ? !!params.doNotProxyLocal : false;
    const builtPreset: ProxyPreset = {
      ... preset != null ? preset : {
        id: randomIdService.getRandomId(),
      },
      title,
      type,
      host,
      port,
      username,
      password,
      proxyDns: ProxyType.isSocksType(type) ? proxyDns ?? true : undefined,
      doNotProxyLocal,
    };

    return builtPreset;
  }

  public async addProxyPreset(params: ProxyPresetParams): Promise<ProxyPreset> {
    const preset = this.buildProxyPreset(params);
    const id = preset.id;
    const storageValue = await this.getValue();
    storageValue[id] = preset;
    await this.setValue(storageValue);
    return preset;
  }

  public async updateProxyPreset(id: string, params: ProxyPresetParams): Promise<ProxyPreset> {
    const origPreset = await this.getProxyPreset(id);
    if (!origPreset) {
      throw new Error('Invalid id');
    }
    const preset = this.buildProxyPreset(params, origPreset);
    const storageValue = await this.getValue();
    storageValue[id] = preset;
    await this.setValue(storageValue);
    return preset;
  }

  public async getProxyPreset(id: string): Promise<ProxyPreset | undefined> {
    const storageValue = await this.getValue();
    return storageValue[id];
  }

  public async getProxyPresetIds(): Promise<string[]> {
    const storageValue = await this.getValue();
    return Object.keys(storageValue);
  }

  public async getProxyPresets(): Promise<ProxyPreset[]> {
    const storageValue = await this.getValue();
    return Object.values(storageValue);
  }

  public async deleteProxyPreset(id: string): Promise<void> {
    const storageValue = await this.getValue();
    delete storageValue[id];
    await this.setValue(storageValue);
  }
}
