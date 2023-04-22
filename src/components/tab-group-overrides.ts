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

import { LanguageSettings } from '../lib/overrides/LanguageSettings';
import { UserAgentSettings, UserAgentPreset } from '../lib/overrides/UserAgentSettings';

import { config } from '../config/config';

import { TabGroupListingElement } from './tab-group-listing';

export class TabGroupOverridesElement extends TabGroupListingElement {
  private readonly _languageSettings = LanguageSettings.getInstance();
  private readonly _userAgentSettings = UserAgentSettings.getInstance();

  public constructor() {
    const languageColumnName = browser.i18n.getMessage('optionsLabelLanguages');
    const userAgentColumnName = browser.i18n.getMessage('optionsLabelUserAgent');
    super(false, '/css/components/tab-group-overrides.css', [languageColumnName, userAgentColumnName]);
  }

  private createLanguageOptionsElement(tabGroupId: string): HTMLInputElement {
    const input = document.createElement('input');
    input.classList.add('languages');
    input.type = 'text';
    this._languageSettings.getLanguages(tabGroupId).then((languages) => {
      input.value = languages;
    });
    input.placeholder = navigator.languages.join(',');
    input.addEventListener('change', () => {
      this._languageSettings.setLanguages(tabGroupId, input.value);
    });
    this._languageSettings.onChanged.addListener(() => {
      this._languageSettings.getLanguages(tabGroupId).then((languages) => {
        input.value = languages;
      });
    });
    config['feature.languageOverrides'].observe((enabled) => {
      input.disabled = !enabled;
    });
    return input;
  }

  private setUserAgentOptions(tabGroupId: string, select: HTMLSelectElement, input: HTMLInputElement, preset: UserAgentPreset, userAgent?: string) {
    select.value = preset;
    if (preset === 'custom') {
      input.readOnly = false;
      input.value = userAgent || navigator.userAgent;
      // this._languageSettings.setUserAgent(originAttributes, userAgent);
    } else {
      input.readOnly = true;
      const promise = Promise.resolve(this._userAgentSettings.getUserAgent(tabGroupId));
      promise.then((userAgent) => {
        input.value = userAgent || navigator.userAgent;
      });
    }
  }

  private handleUserAgentChange(tabGroupId: string, select: HTMLSelectElement, input: HTMLInputElement) {
    const preset = select.value;
    const userAgent = input.value.trim();
    this.setUserAgentOptions(tabGroupId, select, input, preset as UserAgentPreset, userAgent);
    this._userAgentSettings.setUserAgent(tabGroupId, preset as UserAgentPreset, userAgent || undefined).catch((e) => {
      console.error(e);
    });
  }

  private createUserAgentSelectElement(tabGroupId: string, input: HTMLInputElement): HTMLSelectElement {
    const select = document.createElement('select');
    select.classList.add('user-agent-select');
    select.classList.add('browser-style');
    const options = {
      'default': 'userAgentDefault',
      'chrome': 'userAgentChrome',
      'googlebot': 'userAgentGooglebot',
      'custom': 'userAgentCustom',
    };
    for (const [value, message] of Object.entries(options)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = browser.i18n.getMessage(message);
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      this.handleUserAgentChange(tabGroupId, select, input);
    });
    return select;
  }

  private createUserAgentOptionsElement(tabGroupId: string): HTMLDivElement {
    const initialParams = this._userAgentSettings.getUserAgentParams(tabGroupId);
    const element = document.createElement('div');
    element.classList.add('user-agent');

    const input = document.createElement('input');

    const select = this.createUserAgentSelectElement(tabGroupId, input);
    element.appendChild(select);

    input.classList.add('user-agent-custom');
    input.type = 'text';
    input.placeholder = navigator.userAgent;
    input.addEventListener('change', () => {
      this.handleUserAgentChange(tabGroupId, select, input);
    });
    this._userAgentSettings.onChanged.addListener(() => {
      this._userAgentSettings.getUserAgentParams(tabGroupId).then(({preset, userAgent}) => {
        this.setUserAgentOptions(tabGroupId, select, input, preset, userAgent);
      });
    });
    initialParams.then((initialParams) => {
      this.setUserAgentOptions(tabGroupId, select, input, initialParams.preset, initialParams.userAgent);
    });
    element.appendChild(input);

    config['feature.uaOverrides'].observe((enabled) => {
      select.disabled = !enabled;
      input.disabled = !enabled;
    });
    return element;
  }

  protected override createColumnElement(columnId: number, tabGroupId: string): HTMLElement {
    switch (columnId) {
      case 0:
        return this.createLanguageOptionsElement(tabGroupId);
      case 1:
        return this.createUserAgentOptionsElement(tabGroupId);
      default:
        throw new Error(`Unexpected column ID: ${columnId}`);
    }
  }
}

customElements.define('tab-group-overrides', TabGroupOverridesElement);
