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
import { EventSink } from "weeg-events";
import { DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { TemporaryContainerService } from "../lib/tabGroups/TemporaryContainerService";
import { CompatConsole } from '../lib/console/CompatConsole';
import { TabGroupDirectorySnapshot } from '../lib/tabGroups/TabGroupDirectorySnapshot';
import { ContainerVisibilityService } from "../lib/tabGroups/ContainerVisibilityService";
import { DomFactory } from '../lib/DomFactory';
import { BrowserStateDao } from '../lib/states/BrowserStateDao';
import { WindowStateDao } from '../lib/states/WindowStateDao';
import { DisplayedContainerDao } from '../lib/states/DisplayedContainerDao';
import { TabDao } from '../lib/states/TabDao';

import { config } from '../config/config';

import { CtgMenuItemElement } from "./ctg/ctg-menu-item";
import { SupergroupEditorElement } from './supergroup-editor';
import { TagEditorElement } from './tag-editor';
import { MenulistTabElement } from './menulist-tab';

import * as containers from '../legacy-lib/modules/containers';

import { PopupRendererService } from "../pages/popup-v2/PopupRendererService";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class PanelWindowsElement extends HTMLElement {
  public readonly onCollapseContainersButtonClicked = new EventSink<void>();
  public readonly onExpandContainersButtonClicked = new EventSink<void>();
  public readonly onWindowCloseButtonClicked = new EventSink<void>();
  public readonly onCreateContainerButtonClicked = new EventSink<void>();
  public readonly onCreateTemporaryContainerButtonClicked = new EventSink<void>();
  public readonly onCreateGroupButtonClicked = new EventSink<void>();
  public readonly onCreateTagButtonClicked = new EventSink<void>();

  private _selectedWindowId: number = browser.windows.WINDOW_ID_NONE;
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _containerVisibilityService = ContainerVisibilityService.getInstance();
  private readonly _temporaryContainerService = TemporaryContainerService.getInstance();
  private _isSearching = false;
  private _browserState: BrowserStateDao | null = null;
  private _searchString = '';

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = DomFactory.createElement<HTMLLinkElement>('link', this.shadowRoot);
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/panel-windows.css';

    const header = DomFactory.createElement('div', this.shadowRoot, { classNames: ['header'] });
    const headerWindow = DomFactory.createElement('div', header, { classNames: ['header-window'] });
    const headerContainer = DomFactory.createElement('div', header, { classNames: ['header-container'] });
    DomFactory.createElement('select', headerWindow, { classNames: ['window-select', 'browser-style'] });
    DomFactory.createElement('span', headerWindow, { classNames: ['tab-count'] });
    this.defineWindowMenuItems(headerWindow);

    const searchWrapper = DomFactory.createElement('div', headerContainer, { id: 'search-wrapper' });

    const search = DomFactory.createElement<HTMLInputElement>('input', searchWrapper, { id: 'search' });
    search.type = 'search';
    search.placeholder = browser.i18n.getMessage('searchPlaceholder');

    this.defineContainerMenuItems(headerContainer);

    const mainElement = DomFactory.createElement('div', this.shadowRoot, { classNames: ['main'] });
    DomFactory.createElement('div', mainElement, { classNames: ['pinned-tabs'] });
    DomFactory.createElement('div', mainElement, { classNames: ['active-containers'] });
    const detailsElement = DomFactory.createElement<HTMLDetailsElement>('details', mainElement, { classNames: ['inactive-containers-details'] });
    detailsElement.open = !(config['menu.hideEmptyContainers'].tryGetValueSync() ?? false);

    config['menu.hideEmptyContainers'].getValue().then((hideEmptyContainers) => {
      if (hideEmptyContainers) {
        detailsElement.open = false;
      }
    });

    detailsElement.addEventListener('toggle', async () => {
      const hidden = !detailsElement.open;
      const value = await config['menu.hideEmptyContainers'].getValue();
      if (value != hidden) {
        config['menu.hideEmptyContainers'].setValue(hidden);
      }
    });

    const summaryElement = DomFactory.createElement('summary', detailsElement, { classNames: ['inactive-containers-summary'] });
    summaryElement.textContent = browser.i18n.getMessage('currentWindowMoreContainers');
    DomFactory.createElement('div', detailsElement, { classNames: ['inactive-containers'] });
    DomFactory.createElement('div', mainElement, { classNames: ['actions'] });

    const searchResultsElement = DomFactory.createElement('div', this.shadowRoot, { classNames: ['search-results'] });
    searchResultsElement.hidden = true;

    DomFactory.createElement('div', searchResultsElement, { classNames: ['search-results-containers'] });
    DomFactory.createElement('div', searchResultsElement, { classNames: ['search-results-tabs'] });

    this.defineEventHandlers();
  }

  private defineWindowMenuItems(element: HTMLElement): void {
    const collapseContainersMenuItem = this.createMenuItem('collapse-containers', 'tooltipCollapseContainers', '/img/material-icons/unfold_less.svg', this.onCollapseContainersButtonClicked);
    element.appendChild(collapseContainersMenuItem);

    const expandContainersMenuItem = this.createMenuItem('expand-containers', 'tooltipExpandContainers', '/img/material-icons/unfold_more.svg', this.onExpandContainersButtonClicked);
    element.appendChild(expandContainersMenuItem);

    const windowCloseMenuItem = this.createMenuItem('window-close', 'tooltipCloseWindow', '/img/firefox-icons/close.svg', this.onWindowCloseButtonClicked);
    element.appendChild(windowCloseMenuItem);
  }

  private defineContainerMenuItems(element: HTMLElement): void {
    const newTagMenuItem = this.createMenuItem('new-tag', 'buttonNewTag', '/img/material-icons/new_label.svg', this.onCreateTagButtonClicked);
    element.appendChild(newTagMenuItem);

    const newGroupMenuItem = this.createMenuItem('new-group', 'buttonNewGroup', '/img/firefox-icons/folder-add.svg', this.onCreateGroupButtonClicked);
    element.appendChild(newGroupMenuItem);

    const newContainerMenuItem = this.createMenuItem('new-container', 'buttonNewContainer', '/img/firefox-icons/plus.svg', this.onCreateContainerButtonClicked);
    element.appendChild(newContainerMenuItem);

    const newTemporaryContainerMenuItem = this.createMenuItem('new-temporary-container', 'buttonNewTemporaryContainer', '/img/material-icons/timelapse.svg', this.onCreateTemporaryContainerButtonClicked);
    element.appendChild(newTemporaryContainerMenuItem);
  }

  private defineEventHandlers() {
    this.onCollapseContainersButtonClicked.addListener(() => {
      containers.hideAll(this._selectedWindowId).catch((e) => {
        console.error(e);
      });
    });

    this.onExpandContainersButtonClicked.addListener(() => {
      this._containerVisibilityService.showAllOnWindow(this._selectedWindowId).catch((e) => {
        console.error(e);
      });
    });

    this.onWindowCloseButtonClicked.addListener(() => {
      browser.windows.remove(this._selectedWindowId).catch((e) => {
        console.error(e);
      });
    });

    this.onCreateContainerButtonClicked.addListener(() => {
      this._popupRenderer.modalRenderer.showNewContainerPanelAsync().then((result) => {
        if (!result) return;
        console.log('Created new container', result);
      }).catch((e) => {
        console.error(e);
      });
    });

    this.onCreateTemporaryContainerButtonClicked.addListener(() => {
      this._temporaryContainerService.createTemporaryContainer().catch((e) => {
        console.error(e);
      });
    });

    this.onCreateGroupButtonClicked.addListener(() => {
      document.body.appendChild(new SupergroupEditorElement());
    });

    this.onCreateTagButtonClicked.addListener(() => {
      document.body.appendChild(new TagEditorElement());
    });

    if (!this.shadowRoot) return;
    const search = this.shadowRoot.querySelector('#search') as HTMLInputElement;
    search.addEventListener('input', () => {
      this.searchForString(search.value);
    });

    const windowSelect = this.shadowRoot.querySelector('.window-select') as HTMLSelectElement;
    windowSelect.addEventListener('change', () => {
      this._selectedWindowId = parseInt(windowSelect.value);
      if (!this._browserState) return;
      this.renderWindow(this._browserState);
    });
  }

  public setState(browserState: BrowserStateDao) {
    if (this._selectedWindowId == browser.windows.WINDOW_ID_NONE) {
      this._selectedWindowId = browserState.currentWindowId;
    }

    this._browserState = browserState;

    if (!this.shadowRoot) return;

    const windowSelect = this.shadowRoot.querySelector('.window-select') as HTMLSelectElement;
    windowSelect.textContent = '';
    const windowIds = browserState.windowIds;
    if (!windowIds.includes(this._selectedWindowId)) {
      this._selectedWindowId = browserState.currentWindowId;
    }
    for (const windowId of windowIds) {
      const option = document.createElement('option');
      option.value = windowId.toString();
      if (windowId == browserState.currentWindowId) {
        option.textContent = browser.i18n.getMessage('currentWindow', windowId.toFixed(0));
      } else {
        option.textContent = browser.i18n.getMessage('windowLabel', windowId.toFixed(0));
      }
      windowSelect.appendChild(option);
    }
    windowSelect.value = this._selectedWindowId.toString();

    this.renderWindow(browserState);

    this.rerenderSearchView();
  }

  public renderWindow(browserState: BrowserStateDao) {
    if (!this.shadowRoot) return;

    const currentWindowState = browserState.windows[this._selectedWindowId] as WindowStateDao;
    const tabCount = this.shadowRoot.querySelector('.tab-count') as HTMLSpanElement;
    tabCount.textContent = `(${Object.values(currentWindowState.tabs).length})`;

    const newGroupMenuItem = this.shadowRoot.querySelector('.new-group') as CtgMenuItemElement;

    const tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
    let displayedContainers = browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
    if (currentWindowState.isPrivate) {
      displayedContainers = displayedContainers.filter((displayedContainer) => displayedContainer.cookieStore.isPrivate == true);
      newGroupMenuItem.hidden = true;
    } else {
      displayedContainers = displayedContainers.filter((displayedContainer) => displayedContainer.cookieStore.isPrivate == false);
      newGroupMenuItem.hidden = false;
    }
    displayedContainers = [... displayedContainers].sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
    });

    this.renderPinnedTabs(browserState, displayedContainers);

    const activeContainersElement = this.shadowRoot.querySelector('.active-containers') as HTMLDivElement;
    activeContainersElement.textContent = '';
    this._popupRenderer.currentWindowRenderer.renderOpenContainers(browserState, currentWindowState.id, displayedContainers, activeContainersElement, tabGroupDirectorySnapshot);

    const inactiveContainersElement = this.shadowRoot.querySelector('.inactive-containers') as HTMLDivElement;
    inactiveContainersElement.textContent = '';
    this._popupRenderer.currentWindowRenderer.renderInactiveContainers(browserState, currentWindowState.id, displayedContainers, inactiveContainersElement, tabGroupDirectorySnapshot);

    this.renderActions();
  }

  private renderActions() {
    if (!this.shadowRoot) return;

    const actionsElement = this.shadowRoot.querySelector('.actions') as HTMLDivElement;
    actionsElement.textContent = '';

    const newContainerMenuItem = this.createMenuItem('action-new-container', 'buttonNewContainer', '/img/firefox-icons/plus.svg', this.onCreateContainerButtonClicked);
    newContainerMenuItem.displayStyle = 'normal';
    actionsElement.appendChild(newContainerMenuItem);

    const newTemporaryContainerMenuItem = this.createMenuItem('action-new-temporary-container', 'buttonNewTemporaryContainer', '/img/material-icons/timelapse.svg', this.onCreateTemporaryContainerButtonClicked);
    newTemporaryContainerMenuItem.displayStyle = 'normal';
    actionsElement.appendChild(newTemporaryContainerMenuItem);
  }

  private defineDragHandlersForPinnedTab(pinnedTab: CompatTab, tabElement: MenulistTabElement) {
    tabElement.draggable = true;
    tabElement.addEventListener('dragstart', (ev) => {
      if (!ev.dataTransfer) return;
      ev.dataTransfer.setData('application/json', JSON.stringify({
        type: 'tab',
        id: pinnedTab.id,
        index: pinnedTab.index,
        pinned: true,
      }));
      ev.dataTransfer.dropEffect = 'move';
    });
    tabElement.addEventListener('dragover', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || !data.pinned) return;
      ev.preventDefault();
    });
    tabElement.addEventListener('drop', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || !data.pinned) return;
      ev.preventDefault();
      browser.tabs.move(data.id, { index: pinnedTab.index }).catch((e) => {
        console.error(e);
      });
    });
  }

  private renderPinnedTabs(browserState: BrowserStateDao, definedUserContexts: readonly DisplayedContainer[]) {
    const currentWindowState = browserState.windows[this._selectedWindowId] as WindowStateDao;
    const pinnedTabIds = currentWindowState.pinnedTabIds;
    const pinnedTabs = pinnedTabIds.map((tabId) => TabDao.toCompatTab(currentWindowState.tabs[tabId] as TabDao));
    pinnedTabs.sort((a, b) => a.index - b.index);
    const userContextMap = new Map<string, DisplayedContainer>();
    for (const userContext of definedUserContexts) {
      userContextMap.set(userContext.cookieStore.id, userContext);
    }

    if (!this.shadowRoot) return;

    const pinnedTabsElement = this.shadowRoot.querySelector('.pinned-tabs') as HTMLDivElement;
    pinnedTabsElement.textContent = '';
    for (const pinnedTab of pinnedTabs) {
      const userContext = userContextMap.get(pinnedTab.cookieStore.id);
      if (!userContext) {
        console.error('Could not find user context for pinned tab', pinnedTab);
        continue;
      }
      const tabElement = this._popupRenderer.renderTab(pinnedTab, userContext);
      this.defineDragHandlersForPinnedTab(pinnedTab, tabElement);
      pinnedTabsElement.appendChild(tabElement);
    }
  }

  private createMenuItem(className: string, messageName: string, iconUrl: string, eventSink: EventSink<void>): CtgMenuItemElement {
    const menuItem = new CtgMenuItemElement();
    menuItem.displayStyle = 'icon';
    menuItem.iconSrc = iconUrl;
    menuItem.labelText = browser.i18n.getMessage(messageName);
    menuItem.classList.add(className);
    menuItem.addEventListener('click', () => eventSink.dispatch());
    return menuItem;
  }

  public get searchString(): string {
    return this._searchString;
  }

  public rerenderSearchView() {
    this.searchForString(this._searchString);
  }

  public searchForString(searchString = '') {
    searchString = searchString.trim();
    this._searchString = searchString;
    this._isSearching = searchString.length > 0;
    // todo
    if (!this.shadowRoot) return;
    const mainElement = this.shadowRoot.querySelector('.main') as HTMLDivElement;
    const searchResultsElement = this.shadowRoot.querySelector('.search-results') as HTMLDivElement;
    const searchResultsContainersElement = this.shadowRoot.querySelector('.search-results-containers') as HTMLDivElement;
    const searchResultsTabsElement = this.shadowRoot.querySelector('.search-results-tabs') as HTMLDivElement;
    if (this._isSearching) {
      mainElement.hidden = true;
      searchResultsElement.hidden = false;
    } else {
      mainElement.hidden = false;
      searchResultsElement.hidden = true;
      return;
    }

    searchResultsContainersElement.textContent = '';
    searchResultsTabsElement.textContent = '';

    if (!this._browserState) return;
    const tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(this._browserState.supergroups);
    const windowStateSnapshot = this._browserState.windows[this._selectedWindowId] as WindowStateDao;
    const isPrivate = windowStateSnapshot.isPrivate;
    let displayedContainers = [... this._browserState.displayedContainers].map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
    if (isPrivate) {
      displayedContainers = displayedContainers.filter((displayedContainer) => displayedContainer.cookieStore.isPrivate == true);
    } else {
      displayedContainers = displayedContainers.filter((displayedContainer) => displayedContainer.cookieStore.isPrivate != true);
    }
    let tags = Object.values(this._browserState.tags);
    const allUserContexts = [... displayedContainers];
    const searchWords = new Set(searchString.split(/\s+/u).map((searchWord) => searchWord.toLowerCase()));
    let tabs = Object.values(windowStateSnapshot.tabs).map((dao) => TabDao.toCompatTab(dao));
    for (const searchWord of searchWords) {
      displayedContainers = displayedContainers.filter((userContext) => {
        return userContext.name.toLowerCase().includes(searchWord);
      });
      tags = tags.filter((tag) => {
        return tag.name.toLowerCase().includes(searchWord);
      });
    }
    const tagIds = tags.map((tag) => tag.tagId);
    for (const searchWord of searchWords) {
      tabs = tabs.filter((tab) => {
        return tab.title.toLowerCase().includes(searchWord)
          || tab.url.toLowerCase().includes(searchWord)
          || tagIds.includes(this._browserState?.tagIdsForTabs[tab.id] ?? 0);
      });
    }

    tabs.sort((a, b) => {
      return a.index - b.index;
    });
    tabGroupDirectorySnapshot.sortDisplayedContainers(displayedContainers);

    const userContextMap = new Map<string, DisplayedContainer>();
    for (const userContext of allUserContexts) {
      userContextMap.set(userContext.cookieStore.id, userContext);
    }

    for (const userContext of displayedContainers) {
      const tabIds = windowStateSnapshot.unpinnedTabIdsByContainer[userContext.cookieStore.userContextId] || [];
      const containerElement = this._popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, userContext, [], windowStateSnapshot.isPrivate);
      containerElement.tabCount = tabIds.length;
      containerElement.containerVisibilityToggleButton.disabled = true;
      searchResultsContainersElement.appendChild(containerElement);
    }
    for (const tab of tabs) {
      const userContext = userContextMap.get(tab.cookieStore.id);
      if (!userContext) {
        console.error('Could not find user context for tab', tab);
        continue;
      }
      const tabElement = this._popupRenderer.renderTab(tab, userContext);
      searchResultsTabsElement.appendChild(tabElement);
    }
  }

  public focusToSearchBox() {
    if (!this.shadowRoot) return;
    const searchBox = this.shadowRoot.querySelector('#search') as HTMLInputElement;
    searchBox.focus();
  }

  public getFocusableElements(): HTMLElement[] {
    return [... this.shadowRoot?.querySelectorAll('#search, menulist-container, menulist-tab') ?? []] as HTMLElement[];
  }

  public get activeElement(): HTMLElement | null {
    return this.shadowRoot?.activeElement as HTMLElement | null;
  }
}

customElements.define('panel-windows', PanelWindowsElement);
