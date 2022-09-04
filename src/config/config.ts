// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

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

import { ConfigurationOption, StorageConfigurationOption } from "../frameworks/config";
import browser from 'webextension-polyfill';

export type ExternalContainerOption = 'choose' | 'sticky' | 'disabled';
export type PopupSize = 'standard' | 'large';
export type GroupIndexOption = 'never' | 'always' | 'collapsed';

export const config = {
  'newtab.keepContainer': new StorageConfigurationOption<boolean>('newtab.keepContainer', true),
  'tab.external.containerOption': new StorageConfigurationOption<ExternalContainerOption>('tab.external.containerOption', 'choose'),
  'appearance.popupSize': new StorageConfigurationOption<PopupSize>('appearance.popupSize', 'standard'),
  'tab.groups.indexOption': new StorageConfigurationOption<GroupIndexOption>('tab.groups.indexOption', 'never'),
};


class BrowserBooleanSetting implements ConfigurationOption<boolean> {
  private readonly setting: browser.Types.Setting;

  public constructor(setting: browser.Types.Setting) {
    this.setting = setting;
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

export const privacyConfig = {
  firstPartyIsolate: new BrowserBooleanSetting(browser.privacy.websites.firstPartyIsolate),
  resistFingerprinting: new BrowserBooleanSetting(browser.privacy.websites.resistFingerprinting),
};
