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

import { DomFactory } from '../lib/DomFactory';
import { ProxySettings } from '../lib/proxies/ProxySettings';
import { ProxyPreset } from '../lib/proxies/ProxyPreset';

import { ProxyEditorElement } from './proxy-editor';

const proxySettings = ProxySettings.getInstance();

export class ProxyManagerElement extends HTMLElement {

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Failed to attach shadow root');
    }

    const stylesheet = DomFactory.createElement<HTMLLinkElement>('link', this.shadowRoot);
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/css/components/proxy-manager.css';

    const deckProxies = DomFactory.createElement<HTMLDivElement>('div', this.shadowRoot, { id: 'deck-proxies' });
    DomFactory.createElement<HTMLButtonElement>('button', deckProxies, { id: 'button-new-proxy' });
    DomFactory.createElement<HTMLDivElement>('div', deckProxies, { id: 'deck-proxies-inner' });

    const deckProxyEditor = DomFactory.createElement<HTMLDivElement>('div', this.shadowRoot, { id: 'deck-proxy-editor' });
    const proxyEditor = deckProxyEditor.appendChild(new ProxyEditorElement());
    proxyEditor.id = 'proxy-editor';

    this.setLocalizationMessages();

    this.proxyEditor.onProxyPresetIdUpdated.addListener(() => {
      this.renderProxyList();
    });

    proxySettings.presetStore.onChanged.addListener(() => {
      this.renderProxyList();
    });

    this.newProxyButton.addEventListener('click', () => {
      this.proxyEditor.resetForm();
    });

    this.renderProxyList();
    this.proxyEditor.resetForm();
  }

  private setLocalizationMessages(): void {
    this.newProxyButton.title = browser.i18n.getMessage('buttonAddNewProxy');
  }

  private renderProxyList(): void {
    proxySettings.presetStore.getProxyPresets().then((presets) => {
      this.deckProxiesInner.textContent = '';
      const selectedPresetId = this.proxyEditor.selectedPresetId;
      for (const preset of presets) {
        const presetId = preset.id;
        const name = ProxyPreset.getName(preset);
        const button = DomFactory.createElement<HTMLButtonElement>('button', this.deckProxiesInner, { id: `button-proxy-${presetId}` });
        button.textContent = name;
        button.dataset.presetId = presetId;
        button.addEventListener('click', () => {
          this.proxyEditor.setProxyPreset(preset);
        });
        if (selectedPresetId == presetId) {
          button.classList.add('selected');
        }
      }
    });
  }

  private get newProxyButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#button-new-proxy') as HTMLButtonElement;
  }

  private get deckProxiesInner(): HTMLDivElement {
    return this.shadowRoot?.querySelector('#deck-proxies-inner') as HTMLDivElement;
  }

  public get proxyEditor(): ProxyEditorElement {
    return this.shadowRoot?.querySelector('#proxy-editor') as ProxyEditorElement;
  }
}

customElements.define('proxy-manager', ProxyManagerElement);
