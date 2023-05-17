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
import { EventSink } from 'weeg-events';

import { ConfigurationOption } from '../lib/config/ConfigurationOption';
import { StorageConfigurationOption } from '../lib/config/StorageConfigurationOption';

export type ExternalContainerOption = 'choose' | 'sticky' | 'disabled';
export type PopupSize = 'standard' | 'large';
export type GroupIndexOption = 'never' | 'always' | 'collapsed';

export const config = {
  'help.shownOnce': new StorageConfigurationOption<boolean>('help.shownOnce', false),
  'feature.languageOverrides': new StorageConfigurationOption<boolean>('feature.languageOverrides', true),
  'feature.uaOverrides': new StorageConfigurationOption<boolean>('feature.uaOverrides', false),
  'feature.containerProxy': new StorageConfigurationOption<boolean>('feature.containerProxy', false),
  'feature.syncContainers': new StorageConfigurationOption<boolean>('feature.syncContainers', false, 'local'),
  'newtab.keepContainer': new StorageConfigurationOption<boolean>('newtab.keepContainer', true),
  'tab.external.containerOption': new StorageConfigurationOption<ExternalContainerOption>('tab.external.containerOption', 'choose'),
  'appearance.popupSize': new StorageConfigurationOption<PopupSize>('appearance.popupSize', 'standard'),
  'tab.groups.indexOption': new StorageConfigurationOption<GroupIndexOption>('tab.groups.indexOption', 'never'),
  'tab.autoDiscard.minAge': new StorageConfigurationOption<number>('tab.autoDiscard.minAge', -1),
  'tab.sorting.enabled': new StorageConfigurationOption<boolean>('tab.sorting.enabled', true),
  'tab.autoHide.enabled': new StorageConfigurationOption<boolean>('tab.autoHide.enabled', false),
  'menu.hideEmptyContainers': new StorageConfigurationOption<boolean>('menu.hideEmptyContainers', false),
};


export class BrowserBooleanSetting implements ConfigurationOption<boolean> {
  private readonly setting: browser.Types.Setting;

  public readonly onChanged = new EventSink<boolean>();

  public constructor(setting: browser.Types.Setting) {
    this.setting = setting;
    this.setting.onChange.addListener((details) => {
      this.onChanged.dispatch(details.value);
    });
  }

  public async getValue(): Promise<boolean> {
    const details = await this.setting.get({});
    return details.value;
  }

  public async setValue(value: boolean): Promise<void> {
    await this.setting.set({ value });
  }

  public observe(callback: (newValue: boolean) => void): void {
    this.getValue().then(callback);
    this.setting.onChange.addListener((details) => {
      callback(details.value);
    });
  }
}

export class CookieBahavorSetting implements ConfigurationOption<string> {
  private readonly setting = browser.privacy.websites.cookieConfig;

  public readonly onChanged = new EventSink<string>();

  public constructor() {
    this.setting.onChange.addListener((details) => {
      this.onChanged.dispatch(details.value.behavior);
    });
  }

  public async getValue(): Promise<string> {
    const details = await this.setting.get({});
    return details.value.behavior;
  }

  public async setValue(value: string): Promise<void> {
    await this.setting.set({ value: { behavior: value } });
  }

  public observe(callback: (newValue: string) => void): void {
    this.getValue().then(callback);
    this.setting.onChange.addListener((details) => {
      callback(details.value.behavior);
    });
  }
}

export const privacyConfig = {
  firstPartyIsolate: new BrowserBooleanSetting(browser.privacy.websites.firstPartyIsolate),
  resistFingerprinting: new BrowserBooleanSetting(browser.privacy.websites.resistFingerprinting),
  cookieConfigBehavior: new CookieBahavorSetting(),
};
