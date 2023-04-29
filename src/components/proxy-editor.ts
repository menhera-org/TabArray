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

import { ProxyPreset, ProxyPresetParams } from "../lib/proxies/ProxyPreset";
import { ProxyType } from "../lib/proxies/ProxyType";
import { ProxySettings } from '../lib/proxies/ProxySettings';
import { DomFactory } from "../lib/DomFactory";

const proxySettings = ProxySettings.getInstance();

export class ProxyEditorElement extends HTMLElement {
  public readonly onProxyPresetIdUpdated = new EventSink<string | null>();

  private _proxyPresetId: string | null = null;

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Failed to attach shadow root');
    }

    const stylesheet = DomFactory.createElement<HTMLLinkElement>('link', this.shadowRoot);
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/css/components/proxy-editor.css';

    const nameParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    const nameLabel = DomFactory.createElement<HTMLLabelElement>('label', nameParagraph);
    nameLabel.htmlFor = 'proxy-name';
    DomFactory.createElement<HTMLInputElement>('input', nameParagraph, { id: 'proxy-name' });

    const protocolParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    const protocolLabel = DomFactory.createElement<HTMLLabelElement>('label', protocolParagraph);
    protocolLabel.htmlFor = 'proxy-protocol';
    DomFactory.createElement<HTMLSelectElement>('select', protocolParagraph, { id: 'proxy-protocol' });
    const protocols = [ProxyType.HTTP, ProxyType.HTTPS, ProxyType.SOCKS4, ProxyType.SOCKS5];
    for (const protocol of protocols) {
      const option = DomFactory.createElement<HTMLOptionElement>('option', this.selectProxyProtocol);
      option.value = protocol;
      option.text = protocol.toUpperCase();
    }

    const hostnamePortParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    const hostnameLabel = DomFactory.createElement<HTMLLabelElement>('label', hostnamePortParagraph);
    hostnameLabel.htmlFor = 'proxy-hostname';
    DomFactory.createElement<HTMLInputElement>('input', hostnamePortParagraph, { id: 'proxy-hostname' });
    const portLabel = DomFactory.createElement<HTMLLabelElement>('label', hostnamePortParagraph);
    portLabel.htmlFor = 'proxy-port';
    DomFactory.createElement<HTMLInputElement>('input', hostnamePortParagraph, { id: 'proxy-port' });
    this.inputProxyPort.type = 'number';
    this.inputProxyPort.min = '1';
    this.inputProxyPort.max = '65535';
    this.inputProxyPort.step = '1';

    const usernameParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    const usernameLabel = DomFactory.createElement<HTMLLabelElement>('label', usernameParagraph);
    usernameLabel.htmlFor = 'proxy-username';
    DomFactory.createElement<HTMLInputElement>('input', usernameParagraph, { id: 'proxy-username' });

    const passwordParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    const passwordLabel = DomFactory.createElement<HTMLLabelElement>('label', passwordParagraph);
    passwordLabel.htmlFor = 'proxy-password';
    DomFactory.createElement<HTMLInputElement>('input', passwordParagraph, { id: 'proxy-password' });
    this.inputProxyPassword.type = 'password';

    const doNotProxyLocalParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot);
    DomFactory.createElement<HTMLInputElement>('input', doNotProxyLocalParagraph, { id: 'proxy-do-not-proxy-local' });
    this.inputProxyDoNotProxyLocal.type = 'checkbox';
    const doNotProxyLocalLabel = DomFactory.createElement<HTMLLabelElement>('label', doNotProxyLocalParagraph);
    doNotProxyLocalLabel.htmlFor = 'proxy-do-not-proxy-local';

    const proxyDnsParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot, { id: 'p-proxy-dns' });
    DomFactory.createElement<HTMLInputElement>('input', proxyDnsParagraph, { id: 'proxy-dns' });
    this.inputProxyDns.type = 'checkbox';
    const proxyDnsLabel = DomFactory.createElement<HTMLLabelElement>('label', proxyDnsParagraph);
    proxyDnsLabel.htmlFor = 'proxy-dns';

    const actionsParagraph = DomFactory.createElement<HTMLParagraphElement>('p', this.shadowRoot, { id: 'modal-actions' });
    DomFactory.createElement<HTMLButtonElement>('button', actionsParagraph, { classNames: ['button-default'] });

    this.setLocalizationMessages();
    this.defineEventListeners();
  }

  private setLocalizationMessages(): void {
    this.shadowRoot?.querySelector('label[for="proxy-name"]')?.append(browser.i18n.getMessage('proxyName'));
    this.shadowRoot?.querySelector('label[for="proxy-protocol"]')?.append(browser.i18n.getMessage('proxyProtocol'));
    this.shadowRoot?.querySelector('label[for="proxy-hostname"]')?.append(browser.i18n.getMessage('proxyHostname'));
    this.shadowRoot?.querySelector('label[for="proxy-port"]')?.append(browser.i18n.getMessage('proxyPort'));
    this.shadowRoot?.querySelector('label[for="proxy-username"]')?.append(browser.i18n.getMessage('proxyUsername'));
    this.shadowRoot?.querySelector('label[for="proxy-password"]')?.append(browser.i18n.getMessage('proxyPassword'));
    this.shadowRoot?.querySelector('label[for="proxy-do-not-proxy-local"]')?.append(browser.i18n.getMessage('proxyExemptLocalAddresses'));
    this.shadowRoot?.querySelector('label[for="proxy-dns"]')?.append(browser.i18n.getMessage('proxyDnsRequests'));
    this.shadowRoot?.querySelector('#modal-actions > button')?.append(browser.i18n.getMessage('buttonOk'));
  }

  private defineEventListeners(): void {
    this.selectProxyProtocol.addEventListener('change', () => this.updateInputVisibility());
    this.buttonOk.addEventListener('click', () => this.commitForm());
  }

  private updateInputVisibility(): void {
    const protocolValue = this.selectProxyProtocol.value;
    if (protocolValue == ProxyType.HTTP || protocolValue == ProxyType.HTTPS) {
      this.proxyDnsParagraph.hidden = true;
    } else {
      this.proxyDnsParagraph.hidden = false;
    }
  }

  public resetForm(): void {
    this._proxyPresetId = null;
    this.inputProxyName.value = '';
    this.selectProxyProtocol.value = ProxyType.HTTP;
    this.inputProxyHostname.value = '';
    this.inputProxyPort.value = '1080';
    this.inputProxyUsername.value = '';
    this.inputProxyPassword.value = '';
    this.inputProxyDoNotProxyLocal.checked = false;
    this.inputProxyDns.checked = true;
    this.onProxyPresetIdUpdated.dispatch(null);
  }

  public setProxyPreset(proxyPreset: ProxyPreset): void {
    this._proxyPresetId = proxyPreset.id;
    this.inputProxyName.value = proxyPreset.title;
    this.selectProxyProtocol.value = proxyPreset.type;
    this.inputProxyHostname.value = proxyPreset.host;
    this.inputProxyPort.value = proxyPreset.port.toString();
    this.inputProxyUsername.value = proxyPreset.username ?? '';
    this.inputProxyPassword.value = proxyPreset.password ?? '';
    this.inputProxyDoNotProxyLocal.checked = proxyPreset.doNotProxyLocal;
    this.inputProxyDns.checked = proxyPreset.proxyDns ?? true;
    this.onProxyPresetIdUpdated.dispatch(proxyPreset.id);
  }

  private commitForm(): void {
    const presetParams: ProxyPresetParams = {
      title: this.inputProxyName.value.trim(),
      type: this.selectProxyProtocol.value,
      host: this.inputProxyHostname.value.trim(),
      port: parseInt(this.inputProxyPort.value),
      username: this.inputProxyUsername.value,
      password: this.inputProxyPassword.value,
      doNotProxyLocal: this.inputProxyDoNotProxyLocal.checked,
      proxyDns: this.inputProxyDns.checked,
    };
    if (presetParams.host == '') {
      return;
    }
    if (this._proxyPresetId) {
      proxySettings.presetStore.updateProxyPreset(this._proxyPresetId, presetParams).catch((e) => {
        console.error(e);
      });
    } else {
      proxySettings.presetStore.addProxyPreset(presetParams).then((preset) => {
        this._proxyPresetId = preset.id;
        this.onProxyPresetIdUpdated.dispatch(preset.id);
      }).catch((e) => {
        console.error(e);
      });
    }
  }

  private get inputProxyName(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-name') as HTMLInputElement;
  }

  private get selectProxyProtocol(): HTMLSelectElement {
    return this.shadowRoot?.querySelector<HTMLSelectElement>('#proxy-protocol') as HTMLSelectElement;
  }

  private get inputProxyHostname(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-hostname') as HTMLInputElement;
  }

  private get inputProxyPort(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-port') as HTMLInputElement;
  }

  private get inputProxyUsername(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-username') as HTMLInputElement;
  }

  private get inputProxyPassword(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-password') as HTMLInputElement;
  }

  private get inputProxyDoNotProxyLocal(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-do-not-proxy-local') as HTMLInputElement;
  }

  private get inputProxyDns(): HTMLInputElement {
    return this.shadowRoot?.querySelector<HTMLInputElement>('#proxy-dns') as HTMLInputElement;
  }

  private get buttonOk(): HTMLButtonElement {
    return this.shadowRoot?.querySelector<HTMLButtonElement>('#modal-actions > button.button-default') as HTMLButtonElement;
  }

  private get proxyDnsParagraph(): HTMLParagraphElement {
    return this.shadowRoot?.querySelector<HTMLParagraphElement>('#p-proxy-dns') as HTMLParagraphElement;
  }

  public get selectedPresetId(): string | null {
    return this._proxyPresetId;
  }
}

customElements.define('proxy-editor', ProxyEditorElement);
