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

import { BrowserStateSnapshot } from "../frameworks/tabs/BrowserStateSnapshot";
import { EventSink } from "weeg-events";
import { CtgMenuItemElement } from "./ctg/ctg-menu-item";
import browser from 'webextension-polyfill';
import { UserContext } from "../frameworks/tabGroups";
import { Uint32 } from "weeg-types";
import * as containers from '../modules/containers';
import { UserContextVisibilityService } from "../userContexts/UserContextVisibilityService";
import { TemporaryContainerService } from "../containers/TemporaryContainerService";
import { UserContextSortingOrderStore } from "../userContexts/UserContextSortingOrderStore";
import { PopupRendererService } from "../popup-v2/PopupRendererService";

export class PanelWindowsElement extends HTMLElement {
  public readonly onCollapseContainersButtonClicked = new EventSink<void>();
  public readonly onExpandContainersButtonClicked = new EventSink<void>();
  public readonly onWindowCloseButtonClicked = new EventSink<void>();
  public readonly onCreateContainerButtonClicked = new EventSink<void>();
  public readonly onCreateTemporaryContainerButtonClicked = new EventSink<void>();

  private _selectedWindowId: number = browser.windows.WINDOW_ID_NONE;
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _userContextVisibilityService = UserContextVisibilityService.getInstance();
  private readonly _temporaryContainerService = TemporaryContainerService.getInstance();
  private readonly _userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();
  private _isSearching = false;
  private _browserStateSnapshot: BrowserStateSnapshot | null = null;
  private _searchString = '';

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/panel-windows.css';
    this.shadowRoot.appendChild(styleSheet);

    const header = document.createElement('div');
    header.classList.add('header');
    this.shadowRoot.appendChild(header);

    const headerWindow = document.createElement('div');
    headerWindow.classList.add('header-window');
    header.appendChild(headerWindow);

    const headerContainer = document.createElement('div');
    headerContainer.classList.add('header-container');
    header.appendChild(headerContainer);

    const windowSelect = document.createElement('select');
    windowSelect.classList.add('window-select');
    windowSelect.classList.add('browser-style');
    headerWindow.appendChild(windowSelect);

    const tabCount = document.createElement('span');
    tabCount.classList.add('tab-count');
    headerWindow.appendChild(tabCount);

    const collapseContainersMenuItem = this.createMenuItem('collapse-containers', 'tooltipCollapseContainers', '/img/material-icons/unfold_less.svg', this.onCollapseContainersButtonClicked);
    headerWindow.appendChild(collapseContainersMenuItem);

    const expandContainersMenuItem = this.createMenuItem('expand-containers', 'tooltipExpandContainers', '/img/material-icons/unfold_more.svg', this.onExpandContainersButtonClicked);
    headerWindow.appendChild(expandContainersMenuItem);

    const windowCloseMenuItem = this.createMenuItem('window-close', 'tooltipCloseWindow', '/img/firefox-icons/close.svg', this.onWindowCloseButtonClicked);
    headerWindow.appendChild(windowCloseMenuItem);

    const searchWrapper = document.createElement('div');
    searchWrapper.id = 'search-wrapper';
    headerContainer.appendChild(searchWrapper);

    const search = document.createElement('input');
    search.id = 'search';
    search.type = 'search';
    search.placeholder = browser.i18n.getMessage('searchPlaceholder');
    searchWrapper.appendChild(search);

    const newContainerMenuItem = this.createMenuItem('new-container', 'buttonNewContainer', '/img/material-icons/create_new_folder.svg', this.onCreateContainerButtonClicked);
    headerContainer.appendChild(newContainerMenuItem);

    const newTemporaryContainerMenuItem = this.createMenuItem('new-temporary-container', 'buttonNewTemporaryContainer', '/img/material-icons/timelapse.svg', this.onCreateTemporaryContainerButtonClicked);
    headerContainer.appendChild(newTemporaryContainerMenuItem);

    const mainElement = document.createElement('div');
    mainElement.classList.add('main');
    this.shadowRoot.appendChild(mainElement);

    const pinnedTabsElement = document.createElement('div');
    pinnedTabsElement.classList.add('pinned-tabs');
    mainElement.appendChild(pinnedTabsElement);

    const activeContainersElement = document.createElement('div');
    activeContainersElement.classList.add('active-containers');
    mainElement.appendChild(activeContainersElement);

    const inactiveContainersElement = document.createElement('div');
    inactiveContainersElement.classList.add('inactive-containers');
    mainElement.appendChild(inactiveContainersElement);

    const actionsElement = document.createElement('div');
    actionsElement.classList.add('actions');
    mainElement.appendChild(actionsElement);

    const searchResultsElement = document.createElement('div');
    searchResultsElement.classList.add('search-results');
    this.shadowRoot.appendChild(searchResultsElement);
    searchResultsElement.hidden = true;

    const searchResultsContainersElement = document.createElement('div');
    searchResultsContainersElement.classList.add('search-results-containers');
    searchResultsElement.appendChild(searchResultsContainersElement);

    const searchResultsTabsElement = document.createElement('div');
    searchResultsTabsElement.classList.add('search-results-tabs');
    searchResultsElement.appendChild(searchResultsTabsElement);

    this.defineEventHandlers();
  }

  private defineEventHandlers() {
    this.onCollapseContainersButtonClicked.addListener(() => {
      containers.hideAll(this._selectedWindowId).catch((e) => {
        console.error(e);
      });
    });

    this.onExpandContainersButtonClicked.addListener(() => {
      this._userContextVisibilityService.showAllOnWindow(this._selectedWindowId).catch((e) => {
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
      this._temporaryContainerService.createTemporaryContainer().then((identity) => {
        console.debug('Created temporary container', identity);
      }).catch((e) => {
        console.error(e);
      });
    });

    if (!this.shadowRoot) return;
    const search = this.shadowRoot.querySelector('#search') as HTMLInputElement;
    search.addEventListener('input', () => {
      this.searchForString(search.value);
    });
  }

  public setState(browserStateSnapshot: BrowserStateSnapshot) {
    if (this._selectedWindowId == browser.windows.WINDOW_ID_NONE) {
      this._selectedWindowId = browserStateSnapshot.currentWindowId;
    }

    this._browserStateSnapshot = browserStateSnapshot;

    if (!this.shadowRoot) return;

    const windowSelect = this.shadowRoot.querySelector('.window-select') as HTMLSelectElement;
    windowSelect.textContent = '';
    const windowIds = browserStateSnapshot.getWindowIds();
    if (!windowIds.includes(this._selectedWindowId)) {
      this._selectedWindowId = browserStateSnapshot.currentWindowId;
    }
    for (const windowId of windowIds) {
      const option = document.createElement('option');
      option.value = windowId.toString();
      if (windowId == browserStateSnapshot.currentWindowId) {
        option.textContent = browser.i18n.getMessage('currentWindow', windowId.toFixed(0));
      } else {
        option.textContent = browser.i18n.getMessage('windowLabel', windowId.toFixed(0));
      }
      windowSelect.appendChild(option);
    }
    windowSelect.value = this._selectedWindowId.toString();

    this.renderWindow(browserStateSnapshot);
    windowSelect.addEventListener('change', () => {
      this._selectedWindowId = parseInt(windowSelect.value);
      this.renderWindow(browserStateSnapshot);
    });

    this.rerenderSearchView();
  }

  public renderWindow(browserStateSnapshot: BrowserStateSnapshot) {
    if (!this.shadowRoot) return;

    const currentWindowState = browserStateSnapshot.getWindowStateSnapshot(this._selectedWindowId);
    const tabCount = this.shadowRoot.querySelector('.tab-count') as HTMLSpanElement;
    tabCount.textContent = `(${currentWindowState.tabs.length})`;

    const tabGroupDirectorySnapshot = browserStateSnapshot.getTabGroupDirectorySnapshot();
    let definedUserContexts = browserStateSnapshot.getDefinedUserContexts();
    if (currentWindowState.isPrivate) {
      definedUserContexts = definedUserContexts.filter((userContext) => {
        return userContext.id == UserContext.ID_DEFAULT;
      });
    }
    definedUserContexts = [... definedUserContexts].sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStoreId, b.cookieStoreId);
    });

    this.renderPinnedTabs(browserStateSnapshot, definedUserContexts);

    const activeContainersElement = this.shadowRoot.querySelector('.active-containers') as HTMLDivElement;
    activeContainersElement.textContent = '';
    this._popupRenderer.currentWindowRenderer.renderOpenContainers(currentWindowState, definedUserContexts, activeContainersElement, tabGroupDirectorySnapshot);

    const inactiveContainersElement = this.shadowRoot.querySelector('.inactive-containers') as HTMLDivElement;
    inactiveContainersElement.textContent = '';
    this._popupRenderer.currentWindowRenderer.renderInactiveContainers(currentWindowState, definedUserContexts, inactiveContainersElement, tabGroupDirectorySnapshot);

    this.renderActions();
  }

  private renderActions() {
    if (!this.shadowRoot) return;

    const actionsElement = this.shadowRoot.querySelector('.actions') as HTMLDivElement;
    actionsElement.textContent = '';

    const newContainerMenuItem = this.createMenuItem('action-new-container', 'buttonNewContainer', '/img/material-icons/create_new_folder.svg', this.onCreateContainerButtonClicked);
    newContainerMenuItem.displayStyle = 'normal';
    actionsElement.appendChild(newContainerMenuItem);

    const newTemporaryContainerMenuItem = this.createMenuItem('action-new-temporary-container', 'buttonNewTemporaryContainer', '/img/material-icons/timelapse.svg', this.onCreateTemporaryContainerButtonClicked);
    newTemporaryContainerMenuItem.displayStyle = 'normal';
    actionsElement.appendChild(newTemporaryContainerMenuItem);
  }

  private renderPinnedTabs(browserStateSnapshot: BrowserStateSnapshot, definedUserContexts: readonly UserContext[]) {
    const currentWindowState = browserStateSnapshot.getWindowStateSnapshot(this._selectedWindowId);
    const pinnedTabs = [... currentWindowState.pinnedTabs];
    pinnedTabs.sort((a, b) => a.index - b.index);
    const userContextMap = new Map<Uint32.Uint32, UserContext>();
    for (const userContext of definedUserContexts) {
      userContextMap.set(userContext.id, userContext);
    }

    if (!this.shadowRoot) return;

    const pinnedTabsElement = this.shadowRoot.querySelector('.pinned-tabs') as HTMLDivElement;
    pinnedTabsElement.textContent = '';
    for (const pinnedTab of pinnedTabs) {
      const tabElement = this._popupRenderer.renderTab(pinnedTab, userContextMap.get(pinnedTab.userContextId) || UserContext.DEFAULT);
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

    if (!this._browserStateSnapshot) return;
    const windowStateSnapshot = this._browserStateSnapshot.getWindowStateSnapshot(this._selectedWindowId);
    const isPrivate = windowStateSnapshot.isPrivate;
    let userContexts = [... this._browserStateSnapshot.getDefinedUserContexts()];
    if (isPrivate) {
      userContexts = userContexts.filter((userContext) => userContext.id == 0);
    }
    const searchWords = searchString.split(/\s+/u);
    let tabs = [... windowStateSnapshot.tabs];
    for (const searchWord of searchWords) {
      userContexts = userContexts.filter((userContext) => {
        return userContext.name.toLowerCase().includes(searchWord.toLowerCase());
      });
      tabs = tabs.filter((tab) => {
        return tab.title.toLowerCase().includes(searchWord.toLowerCase())
          || tab.url.toLowerCase().includes(searchWord.toLowerCase());
      });
    }
    tabs.sort((a, b) => {
      return a.index - b.index;
    });
    userContexts = this._userContextSortingOrderStore.sort(userContexts);

    const userContextMap = new Map<Uint32.Uint32, UserContext>();
    for (const userContext of userContexts) {
      userContextMap.set(userContext.id, userContext);
    }

    for (const userContext of userContexts) {
      const tabs = windowStateSnapshot.userContextUnpinnedTabMap.get(userContext.id) || [];
      const containerElement = this._popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, userContext, [], windowStateSnapshot.isPrivate);
      containerElement.tabCount = tabs.length;
      containerElement.containerVisibilityToggleButton.disabled = true;
      searchResultsContainersElement.appendChild(containerElement);
    }
    for (const tab of tabs) {
      const tabElement = this._popupRenderer.renderTab(tab, userContextMap.get(tab.userContextId) || UserContext.DEFAULT);
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
