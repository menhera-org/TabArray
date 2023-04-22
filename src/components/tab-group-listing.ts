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
import { DomFactory } from '../lib/DomFactory';

export abstract class TabGroupListingElement extends HTMLElement {
  private readonly _columns: readonly string[];
  private readonly _sortingEnabled: boolean;
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();

  protected readonly tabGroupService = TabGroupService.getInstance();
  protected readonly tabGroupDirectory = this.tabGroupService.directory;
  protected readonly contextualIdentityFactory = this._contextualIdentityService.getFactory();
  protected readonly displayedContainerFactory = this._contextualIdentityService.getDisplayedContainerFactory();

  public constructor(enableSorting = false, stylesheet = '/css/components/tab-group-listing.css', columns: string[] = []) {
    super();
    this._columns = columns;
    this._sortingEnabled = enableSorting;

    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = stylesheet;
    this.shadowRoot.appendChild(styleSheet);

    const sorterWrapperElement = DomFactory.createElement<HTMLDivElement>('div', this.shadowRoot, { id: 'sorter-wrapper' });
    const headerElement = DomFactory.createElement<HTMLDivElement>('div', sorterWrapperElement, { classNames: ['header'] });

    const headerContainerElement = DomFactory.createElement<HTMLDivElement>('div', headerElement, { classNames: ['header-container'] });
    headerContainerElement.textContent = browser.i18n.getMessage('menuItemMain');

    for (const columnName of columns) {
      const headerColumnElement = DomFactory.createElement<HTMLDivElement>('div', headerElement, { classNames: ['header-column'] });
      headerColumnElement.textContent = columnName;
    }

    const groupsElement = document.createElement('div');
    groupsElement.id = 'groups';
    sorterWrapperElement.appendChild(groupsElement);

    this.render().catch((e) => {
      console.error(e);
    });

    this.tabGroupDirectory.onChanged.addListener(() => {
      this.render().catch((e) => {
        console.error(e);
      });
    });
  }

  public getColumnNames(): readonly string[] {
    return this._columns;
  }

  public get columnCount(): number {
    return this._columns.length;
  }

  public get sortingEnabled(): boolean {
    return this._sortingEnabled;
  }

  protected abstract createColumnElement(columnId: number, tabGroupId: string): HTMLElement;

  protected renderTabGroup(nestingCount: number, tabGroup: { displayedContainer?: DisplayedContainer, supergroup?: SupergroupType }): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('container');

    const containerInnerElement = document.createElement('div');
    containerInnerElement.classList.add('container-inner');
    element.appendChild(containerInnerElement);

    containerInnerElement.style.marginInlineStart = `${nestingCount * 2}em`;

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    containerInnerElement.appendChild(iconElement);

    const nameElement = document.createElement('div');
    nameElement.classList.add('name');
    containerInnerElement.appendChild(nameElement);

    let tabGroupId: string;
    if (tabGroup.displayedContainer != null) {
      tabGroupId = tabGroup.displayedContainer.cookieStore.id;
      const displayedContainer = tabGroup.displayedContainer;

      if (displayedContainer.cookieStore.userContextId == 0) {
        iconElement.style.mask = `url(${displayedContainer.iconUrl}) center center / 75% no-repeat`;
        iconElement.classList.add('masked');
      } else {
        iconElement.style.background = `url(${displayedContainer.iconUrl}) center center / 75% no-repeat`;
      }

      nameElement.textContent = displayedContainer.name;
    } else if (tabGroup.supergroup != null) {
      tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(tabGroup.supergroup.supergroupId);
      const supergroup = tabGroup.supergroup;

      iconElement.style.mask = `url(/img/material-icons/folder.svg) center center / 75% no-repeat`;
      iconElement.classList.add('masked');

      nameElement.textContent = supergroup.name;
    } else {
      throw new Error('Tab group is neither displayed container nor supergroup');
    }

    if (this.sortingEnabled) {
      const upButton = document.createElement('button');
      upButton.classList.add('up');
      containerInnerElement.appendChild(upButton);
      upButton.addEventListener('click', () => {
        this.tabGroupDirectory.moveTabGroupUp(tabGroupId).catch((e) => {
          console.error(e);
        });
      });

      const downButton = document.createElement('button');
      downButton.classList.add('down');
      containerInnerElement.appendChild(downButton);
      downButton.addEventListener('click', () => {
        this.tabGroupDirectory.moveTabGroupDown(tabGroupId).catch((e) => {
          console.error(e);
        });
      });
    }

    const columns = this.getColumnNames();
    for (let i = 0; i < columns.length; i++) {
      const column = this.createColumnElement(i, tabGroupId);
      element.appendChild(column);
    }
    return element;
  }

  private renderSupergroup(nestingCount: number, supergroup: SupergroupType, displayedContainerMap: Map<string, DisplayedContainer>, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, element: HTMLElement): void {
    for (const tabGroupId of supergroup.members) {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        const displayedContainer = displayedContainerMap.get(tabGroupId);
        if (!displayedContainer) continue;
        const containerElement = this.renderTabGroup(nestingCount, { displayedContainer });
        element.appendChild(containerElement);
      } else {
        const supergroup = tabGroupDirectorySnapshot.getSupergroup(tabGroupId) as SupergroupType;
        const supergroupElement = this.renderTabGroup(nestingCount, { supergroup });
        element.appendChild(supergroupElement);
        this.renderSupergroup(nestingCount + 1, supergroup, displayedContainerMap, tabGroupDirectorySnapshot, element);
      }
    }
  }

  public async render(): Promise<void> {
    const groupsElement = this.shadowRoot?.getElementById('groups') as HTMLDivElement;
    const snapshot = await this.tabGroupDirectory.getSnapshot();
    const cookieStoreIds = snapshot.getContainerOrder();
    const displayedContainerMap = new Map<string, DisplayedContainer>();
    for (const cookieStoreId of cookieStoreIds) {
      const cookieStore = new CookieStore(cookieStoreId);
      if (cookieStore.userContextId == 0) {
        const displayedContainer = this.displayedContainerFactory.createFromCookieStore(cookieStore);
        displayedContainerMap.set(cookieStoreId, displayedContainer);
      } else {
        const contextualIdentity = await this.contextualIdentityFactory.get(cookieStoreId);
        displayedContainerMap.set(cookieStoreId, contextualIdentity);
      }
    }
    const rootSupergroupTabGroupId = TabGroupDirectory.getRootSupergroupId();
    const rootSupergroup = snapshot.getSupergroup(rootSupergroupTabGroupId) as SupergroupType;
    groupsElement.textContent = '';
    this.renderSupergroup(0, rootSupergroup, displayedContainerMap, snapshot, groupsElement);
  }
}

// this is not needed
// customElements.define('tab-group-listing', TabGroupListingElement);
