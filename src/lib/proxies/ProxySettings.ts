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

import { AbstractPerContainerSettings } from "../overrides/AbstractPerContainerSettings";
import { ProxyPreset } from "./ProxyPreset";
import { ProxyPresetStore } from "./ProxyPresetStore";

/**
 * Per-container proxy presets.
 */
export class ProxySettings extends AbstractPerContainerSettings<string> {
  private static readonly STORAGE_KEY = 'proxiesByContainer';
  private static readonly INSTANCE = new ProxySettings();

  public static getInstance(): ProxySettings {
    return ProxySettings.INSTANCE;
  }

  public readonly presetStore = new ProxyPresetStore();

  private constructor() {
    super();
  }

  protected override getStorageKey(): string {
    return ProxySettings.STORAGE_KEY;
  }

  /**
   * Should be called by background script.
   */
  public async removeUnknownPresetIds(): Promise<void> {
    const presetIds = await this.presetStore.getProxyPresetIds();
    const value = await this.getValue();
    for (const tabGroupId in value) {
      const presetId = value[tabGroupId] as string;
      if (!presetIds.includes(presetId)) {
        delete value[tabGroupId];
      }
    }
    await this.setValue(value);
  }

  public async setValueForTabGroup(tabGroupId: string, proxyPresetId: string): Promise<void> {
    if (proxyPresetId == '') {
      await this.removeTabGroup(tabGroupId);
      return;
    }
    const preset = await this.presetStore.getProxyPreset(proxyPresetId);
    if (preset == null) {
      throw new Error('Invalid proxy preset ID');
    }
    await this.rawSetValueForTabGroup(tabGroupId, proxyPresetId);
  }

  public async getProxyForTabGroup(tabGroupId: string): Promise<ProxyPreset | undefined> {
    const presetId = await this.getValueForTabGroup(tabGroupId);
    if (!presetId) return undefined;
    const preset = await this.presetStore.getProxyPreset(presetId);
    return preset;
  }
}
