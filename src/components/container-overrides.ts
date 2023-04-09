// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { EventSink } from "weeg-events";

import { UserContext } from "../frameworks/tabGroups";
import { Uint32 } from "weeg-types";
import { LanguageSettings } from '../languages/LanguageSettings';
import { UserAgentSettings, UserAgentPreset } from '../overrides/UserAgentSettings';
import { config } from '../config/config';

export class ContainerOverridesElement extends HTMLElement {
  private readonly _languageSettings = LanguageSettings.getInstance();
  private readonly _userAgentSettings = UserAgentSettings.getInstance();
  public readonly onChanged = new EventSink<Uint32.Uint32[]>();

  public constructor(userContexts: UserContext[]) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/container-overrides.css';
    this.shadowRoot.appendChild(styleSheet);

    const containersWrapperElement = document.createElement('div');
    containersWrapperElement.id = 'containers-wrapper';
    this.shadowRoot.appendChild(containersWrapperElement);

    const headerElement = document.createElement('div');
    headerElement.classList.add('header');
    containersWrapperElement.appendChild(headerElement);

    const headerContainerElement = document.createElement('div');
    headerContainerElement.classList.add('header-container');
    headerContainerElement.textContent = browser.i18n.getMessage('menuItemMain');
    headerElement.appendChild(headerContainerElement);

    const headerLanguagesElement = document.createElement('div');
    headerLanguagesElement.classList.add('header-languages');
    headerLanguagesElement.textContent = browser.i18n.getMessage('optionsLabelLanguages');
    headerElement.appendChild(headerLanguagesElement);

    const headerUserAgentElement = document.createElement('div');
    headerUserAgentElement.classList.add('header-user-agent');
    headerUserAgentElement.textContent = browser.i18n.getMessage('optionsLabelUserAgent');
    headerElement.appendChild(headerUserAgentElement);

    const containersElement = document.createElement('div');
    containersElement.id = 'containers';
    containersWrapperElement.appendChild(containersElement);

    this.setUserContexts(userContexts);
  }

  private get containersElement(): HTMLDivElement {
    const element = this.shadowRoot?.getElementById('containers');
    if (!element) {
      throw new Error('Containers element is null');
    }
    return element as HTMLDivElement;
  }

  private createLanguageOptionsElement(userContext: UserContext): HTMLInputElement {
    const originAttributes = userContext.toOriginAttributes();
    const languages = this._languageSettings.getLanguages(originAttributes);
    const input = document.createElement('input');
    input.classList.add('languages');
    input.type = 'text';
    input.value = languages;
    input.placeholder = navigator.languages.join(',');
    input.addEventListener('change', () => {
      this._languageSettings.setLanguages(originAttributes, input.value);
    });
    this._languageSettings.onChanged.addListener(() => {
      input.value = this._languageSettings.getLanguages(originAttributes);
    });
    config['feature.languageOverrides'].observe((enabled) => {
      input.disabled = !enabled;
    });
    return input;
  }

  private setUserAgentOptions(userContext: UserContext, select: HTMLSelectElement, input: HTMLInputElement, preset: UserAgentPreset, userAgent?: string) {
    const originAttributes = userContext.toOriginAttributes();
    select.value = preset;
    if (preset === 'custom') {
      input.readOnly = false;
      input.value = userAgent || navigator.userAgent;
      // this._languageSettings.setUserAgent(originAttributes, userAgent);
    } else {
      input.readOnly = true;
      input.value = this._userAgentSettings.getUserAgent(originAttributes.cookieStoreId) || navigator.userAgent;
    }
  }

  private handleUserAgentChange(userContext: UserContext, select: HTMLSelectElement, input: HTMLInputElement) {
    const preset = select.value;
    const userAgent = input.value.trim();
    this.setUserAgentOptions(userContext, select, input, preset as UserAgentPreset, userAgent);
    const originAttributes = userContext.toOriginAttributes();
    this._userAgentSettings.setUserAgent(originAttributes.cookieStoreId, preset as UserAgentPreset, userAgent || undefined);
  }

  private createUserAgentSelectElement(userContext: UserContext, input: HTMLInputElement): HTMLSelectElement {
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
      this.handleUserAgentChange(userContext, select, input);
    });
    return select;
  }

  private createUserAgentOptionsElement(userContext: UserContext): HTMLDivElement {
    const originAttributes = userContext.toOriginAttributes();
    const initialParams = this._userAgentSettings.getUserAgentParams(originAttributes.cookieStoreId);
    const element = document.createElement('div');
    element.classList.add('user-agent');

    const input = document.createElement('input');

    const select = this.createUserAgentSelectElement(userContext, input);
    element.appendChild(select);

    input.classList.add('user-agent-custom');
    input.type = 'text';
    input.placeholder = navigator.userAgent;
    input.addEventListener('change', () => {
      this.handleUserAgentChange(userContext, select, input);
    });
    this._userAgentSettings.onChanged.addListener(() => {
      const {preset, userAgent} = this._userAgentSettings.getUserAgentParams(originAttributes.cookieStoreId);
      this.setUserAgentOptions(userContext, select, input, preset, userAgent);
    });
    this.setUserAgentOptions(userContext, select, input, initialParams.preset, initialParams.userAgent);
    element.appendChild(input);

    config['feature.uaOverrides'].observe((enabled) => {
      select.disabled = !enabled;
      input.disabled = !enabled;
    });
    return element;
  }

  private renderUserContext(userContext: UserContext): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');
    element.dataset.userContextId = userContext.id.toString();

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    iconElement.style.mask = `url(${userContext.iconUrl}) center center / 75% no-repeat`;
    iconElement.style.backgroundColor = userContext.colorCode;
    element.appendChild(iconElement);

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    nameElement.textContent = userContext.name;
    element.appendChild(nameElement);

    const languageOptions = this.createLanguageOptionsElement(userContext);
    element.appendChild(languageOptions);

    const userAgentOptions = this.createUserAgentOptionsElement(userContext);
    element.appendChild(userAgentOptions);

    return element;
  }

  public setUserContexts(userContexts: UserContext[]) {
    const containersElement = this.containersElement;
    containersElement.textContent = '';
    for (const userContext of userContexts) {
      containersElement.appendChild(this.renderUserContext(userContext));
    }
  }
}

customElements.define('container-overrides', ContainerOverridesElement);
