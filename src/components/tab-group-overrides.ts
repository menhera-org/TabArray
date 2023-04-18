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
import { CookieStore, DisplayedContainer } from 'weeg-containers';

import { SupergroupType, TabGroupDirectory } from '../lib/tabGroups/TabGroupDirectory';
import { ContextualIdentityService } from '../lib/tabGroups/ContextualIdentityService';
import { TabGroupAttributes } from '../lib/tabGroups/TabGroupAttributes';
import { TabGroupDirectorySnapshot } from '../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabGroupService } from '../lib/tabGroups/TabGroupService';
import { LanguageSettings } from '../lib/overrides/LanguageSettings';
import { UserAgentSettings, UserAgentPreset } from '../lib/overrides/UserAgentSettings';
import { config } from '../config/config';

export class TabGroupOverridesElement extends HTMLElement {
  private readonly _tabGroupService = TabGroupService.getInstance();
  private readonly _tabGroupDirectory = this._tabGroupService.directory;
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _contextualIdentityFactory = this._contextualIdentityService.getFactory();
  private readonly _displayedContainerFactory = this._contextualIdentityService.getDisplayedContainerFactory();
  private readonly _languageSettings = LanguageSettings.getInstance();
  private readonly _userAgentSettings = UserAgentSettings.getInstance();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/tab-group-overrides.css';
    this.shadowRoot.appendChild(styleSheet);

    const sorterWrapperElement = document.createElement('div');
    sorterWrapperElement.id = 'sorter-wrapper';
    this.shadowRoot.appendChild(sorterWrapperElement);

    const headerElement = document.createElement('div');
    headerElement.classList.add('header');
    sorterWrapperElement.appendChild(headerElement);

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

    const groupsElement = document.createElement('div');
    groupsElement.id = 'groups';
    sorterWrapperElement.appendChild(groupsElement);

    this.render().catch((e) => {
      console.error(e);
    });

    this._tabGroupDirectory.onChanged.addListener(() => {
      this.render().catch((e) => {
        console.error(e);
      });
    });
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

  private renderCookieStore(nestingCount: number, displayedContainer: DisplayedContainer): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');

    const containerInnerElement = document.createElement('div');
    containerInnerElement.classList.add('container-inner');
    element.appendChild(containerInnerElement);

    containerInnerElement.style.marginInlineStart = `${nestingCount * 2}em`;

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    if (displayedContainer.cookieStore.userContextId == 0) {
      iconElement.style.mask = `url(${displayedContainer.iconUrl}) center center / 75% no-repeat`;
      iconElement.classList.add('masked');
      iconElement.style.backgroundColor = displayedContainer.colorCode;
    } else {
      iconElement.style.background = `url(${displayedContainer.iconUrl}) center center / 75% no-repeat`;
      containerInnerElement.appendChild(iconElement);
    }

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    nameElement.textContent = displayedContainer.name;
    containerInnerElement.appendChild(nameElement);

    const languageOptions = this.createLanguageOptionsElement(displayedContainer.cookieStore.id);
    element.appendChild(languageOptions);

    const userAgentOptions = this.createUserAgentOptionsElement(displayedContainer.cookieStore.id);
    element.appendChild(userAgentOptions);

    return element;
  }

  private renderSupergroupElement(nestingCount: number, supergroup: SupergroupType): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');

    const containerInnerElement = document.createElement('div');
    containerInnerElement.classList.add('container-inner');
    element.appendChild(containerInnerElement);

    containerInnerElement.style.marginInlineStart = `${nestingCount * 2}em`;

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    iconElement.style.mask = `url(/img/material-icons/folder.svg) center center / 75% no-repeat`;
    iconElement.classList.add('masked');
    containerInnerElement.appendChild(iconElement);

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    nameElement.textContent = supergroup.name;
    containerInnerElement.appendChild(nameElement);

    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);

    const languageOptions = this.createLanguageOptionsElement(tabGroupId);
    element.appendChild(languageOptions);

    const userAgentOptions = this.createUserAgentOptionsElement(tabGroupId);
    element.appendChild(userAgentOptions);

    return element;
  }

  private renderSupergroup(nestingCount: number, supergroup: SupergroupType, displayedContainerMap: Map<string, DisplayedContainer>, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, element: HTMLElement): void {
    for (const tabGroupId of supergroup.members) {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        const contextualIdentity = displayedContainerMap.get(tabGroupId);
        if (!contextualIdentity) continue;
        const containerElement = this.renderCookieStore(nestingCount, contextualIdentity);
        element.appendChild(containerElement);
      } else {
        const supergroup = tabGroupDirectorySnapshot.getSupergroup(tabGroupId) as SupergroupType;
        const supergroupElement = this.renderSupergroupElement(nestingCount, supergroup);
        element.appendChild(supergroupElement);
        this.renderSupergroup(nestingCount + 1, supergroup, displayedContainerMap, tabGroupDirectorySnapshot, element);
      }
    }
  }

  public async render(): Promise<void> {
    const groupsElement = this.shadowRoot?.getElementById('groups') as HTMLDivElement;
    const snapshot = await this._tabGroupDirectory.getSnapshot();
    const cookieStoreIds = snapshot.getContainerOrder();
    const displayedContainerMap = new Map<string, DisplayedContainer>();
    for (const cookieStoreId of cookieStoreIds) {
      const cookieStore = new CookieStore(cookieStoreId);
      if (cookieStore.userContextId == 0) {
        const displayedContainer = this._displayedContainerFactory.createFromCookieStore(cookieStore);
        displayedContainerMap.set(cookieStoreId, displayedContainer);
      } else {
        const contextualIdentity = await this._contextualIdentityFactory.get(cookieStoreId);
        displayedContainerMap.set(cookieStoreId, contextualIdentity);
      }
    }
    const rootSupergroupTabGroupId = TabGroupDirectory.getRootSupergroupId();
    const rootSupergroup = snapshot.getSupergroup(rootSupergroupTabGroupId) as SupergroupType;
    groupsElement.textContent = '';
    this.renderSupergroup(0, rootSupergroup, displayedContainerMap, snapshot, groupsElement);
  }
}

customElements.define('tab-group-overrides', TabGroupOverridesElement);
