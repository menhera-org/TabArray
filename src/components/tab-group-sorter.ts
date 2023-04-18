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
import { TabGroupOptionDirectory } from '../lib/tabGroups/TabGroupOptionDirectory';
import { ContextualIdentityService } from '../lib/tabGroups/ContextualIdentityService';
import { TabGroupAttributes } from '../lib/tabGroups/TabGroupAttributes';
import { TabGroupDirectorySnapshot } from '../lib/tabGroups/TabGroupDirectorySnapshot';

export class TabGroupSorterElement extends HTMLElement {
  private readonly _tabGroupDirectory = new TabGroupDirectory();
  private readonly _tabGroupOptionDirectory = new TabGroupOptionDirectory();
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _contextualIdentityFactory = this._contextualIdentityService.getFactory();
  private readonly _displayedContainerFactory = this._contextualIdentityService.getDisplayedContainerFactory();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/tab-group-sorter.css';
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

    const headerAutocleanElement = document.createElement('div');
    headerAutocleanElement.classList.add('header-autoclean');
    headerAutocleanElement.textContent = browser.i18n.getMessage('enableCookiesAutoclean');
    headerElement.appendChild(headerAutocleanElement);

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

  private createOptionsElement(cookieStoreId: string): HTMLDivElement {
    const options = document.createElement('div');
    options.classList.add('options');
    options.classList.add('browser-style');
    const autocleanCheckbox = document.createElement('input');
    autocleanCheckbox.type = 'checkbox';

    this._tabGroupOptionDirectory.getAutocleanEnabledTabGroupIds().then((tabGroupIds) => {
      if (tabGroupIds.includes(cookieStoreId)) {
        autocleanCheckbox.checked = true;
      } else {
        autocleanCheckbox.checked = false;
      }
    });
    autocleanCheckbox.addEventListener('change', () => {
      this._tabGroupOptionDirectory.setAutocleanForTabGroupId(cookieStoreId, autocleanCheckbox.checked).catch((e) => {
        console.error(e);
      });
    });
    options.appendChild(autocleanCheckbox);
    return options;
  }

  private renderUserContext(nestingCount: number, displayedContainer: DisplayedContainer): HTMLDivElement {
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

    const upButton = document.createElement('button');
    upButton.classList.add('up');
    containerInnerElement.appendChild(upButton);
    upButton.addEventListener('click', () => {
      this._tabGroupDirectory.moveTabGroupUp(displayedContainer.cookieStore.id).catch((e) => {
        console.error(e);
      });
    });

    const downButton = document.createElement('button');
    downButton.classList.add('down');
    containerInnerElement.appendChild(downButton);
    downButton.addEventListener('click', () => {
      this._tabGroupDirectory.moveTabGroupDown(displayedContainer.cookieStore.id).catch((e) => {
        console.error(e);
      });
    });

    const options = this.createOptionsElement(displayedContainer.cookieStore.id);
    element.appendChild(options);

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

    const upButton = document.createElement('button');
    upButton.classList.add('up');
    containerInnerElement.appendChild(upButton);
    upButton.addEventListener('click', () => {
      this._tabGroupDirectory.moveTabGroupUp(tabGroupId).catch((e) => {
        console.error(e);
      });
    });

    const downButton = document.createElement('button');
    downButton.classList.add('down');
    containerInnerElement.appendChild(downButton);
    downButton.addEventListener('click', () => {
      this._tabGroupDirectory.moveTabGroupDown(tabGroupId).catch((e) => {
        console.error(e);
      });
    });

    const options = this.createOptionsElement(tabGroupId);
    element.appendChild(options);

    return element;
  }

  private renderSupergroup(nestingCount: number, supergroup: SupergroupType, displayedContainerMap: Map<string, DisplayedContainer>, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, element: HTMLElement): void {
    for (const tabGroupId of supergroup.members) {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        const contextualIdentity = displayedContainerMap.get(tabGroupId);
        if (!contextualIdentity) continue;
        const containerElement = this.renderUserContext(nestingCount, contextualIdentity);
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

customElements.define('tab-group-sorter', TabGroupSorterElement);
