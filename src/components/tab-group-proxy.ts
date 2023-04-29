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

import { ProxySettings } from '../lib/proxies/ProxySettings';
import { ProxyPreset } from '../lib/proxies/ProxyPreset';

import { config } from '../config/config';

import { TabGroupListingElement } from './tab-group-listing';

export class TabGroupProxyElement extends TabGroupListingElement {
  private readonly _proxySettings = ProxySettings.getInstance();

  public constructor() {
    const languageColumnName = browser.i18n.getMessage('optionsTabProxies');
    super(false, '/css/components/tab-group-proxy.css', [languageColumnName]);
    this._proxySettings.presetStore.onChanged.addListener(() => {
      this.render().catch((e) => {
        console.error(e);
      });
    });
  }

  private createProxyOptionsElement(tabGroupId: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.classList.add('proxies');
    select.classList.add('browser-style');

    const updateSelectedProxy = () => {
      this._proxySettings.getValueForTabGroup(tabGroupId).then((proxyId) => {
        if (!proxyId) {
          select.value = '';
        } else {
          select.value = proxyId;
        }
      });
    };

    this._proxySettings.presetStore.getProxyPresets().then((presets) => {
      select.textContent = '';
      {
        const option = document.createElement('option');
        option.value = '';
        option.text = browser.i18n.getMessage('noProxy');
        select.appendChild(option);
      }

      for (const preset of presets) {
        const name = ProxyPreset.getName(preset);
        const id = preset.id;
        const option = document.createElement('option');
        option.value = id;
        option.text = name;
        select.appendChild(option);
      }

      updateSelectedProxy();
    });

    this._proxySettings.onChanged.addListener(updateSelectedProxy);

    select.addEventListener('change', () => {
      this._proxySettings.setValueForTabGroup(tabGroupId, select.value).catch((e) => {
        console.error(e);
      });
    });

    config['feature.containerProxy'].observe((enabled) => {
      select.disabled = !enabled;
    });

    return select;
  }

  protected override createColumnElement(columnId: number, tabGroupId: string): HTMLElement {
    switch (columnId) {
      case 0:
        return this.createProxyOptionsElement(tabGroupId);
      default:
        throw new Error(`Unexpected column ID: ${columnId}`);
    }
  }
}

customElements.define('tab-group-proxy', TabGroupProxyElement);
