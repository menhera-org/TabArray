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

import browser from "webextension-polyfill";
import { CookieStore, DisplayedContainer } from "weeg-containers";
import { EventSink } from "weeg-events";

import { TemporaryContainerService } from "../../../lib/tabGroups/TemporaryContainerService";
import { SupergroupType } from "../../../lib/tabGroups/TabGroupDirectory";
import { TabGroupAttributes } from "../../../lib/tabGroups/TabGroupAttributes";
import { SupergroupService } from "../../../lib/tabGroups/SupergroupService";
import { TabQueryService } from "../../../lib/tabs/TabQueryService";
import { TabService } from "../../../lib/tabs/TabService";
import { IndexTabService } from "../../../lib/tabs/IndexTabService";
import { CompatConsole } from "../../../lib/console/CompatConsole";
import { BrowserStateDao } from "../../../lib/states/BrowserStateDao";
import { TabGroupDirectorySnapshot } from "../../../lib/tabGroups/TabGroupDirectorySnapshot";
import { DisplayedContainerDao } from "../../../lib/states/DisplayedContainerDao";
import { TabDao } from "../../../lib/states/TabDao";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../../components/ctg/ctg-menu-item";
import { MenulistSupergroupElement } from "../../../components/menulist-supergroup";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { PopupRendererService } from "../PopupRendererService";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class ContainersFragmentBuilder extends AbstractFragmentBuilder {
  public readonly onContainerSelected = new EventSink<string>();

  private _containerCount = 0;
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _temporaryContainerService = TemporaryContainerService.getInstance();
  private readonly _supergroupService = SupergroupService.getInstance();
  private readonly _tabQueryService = TabQueryService.getInstance();
  private readonly _tabService = TabService.getInstance();
  private readonly _indexTabService = IndexTabService.getInstance();

  public getFragmentId(): string {
    return 'fragment-containers';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemMain');
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/folder.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();

    const activeContainersElement = document.createElement('div');
    activeContainersElement.classList.add('active-containers');
    fragment.appendChild(activeContainersElement);

    const inactiveContainersElement = document.createElement('div');
    inactiveContainersElement.classList.add('inactive-containers');
    fragment.appendChild(inactiveContainersElement);

    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    const newContainerMenuItem = new CtgMenuItemElement();
    newContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newContainerMenuItem.iconSrc = '/img/firefox-icons/plus.svg';
    topBarElement.addMenuItem('new-container', newContainerMenuItem);

    const newNormalContainerMenuItem = new CtgMenuItemElement();
    newNormalContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newNormalContainerMenuItem.iconSrc = '/img/firefox-icons/plus.svg';
    newContainerMenuItem.appendChild(newNormalContainerMenuItem);

    const newTemporaryContainerMenuItem = new CtgMenuItemElement();
    newTemporaryContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewTemporaryContainer');
    newTemporaryContainerMenuItem.iconSrc = '/img/material-icons/timelapse.svg';
    newContainerMenuItem.appendChild(newTemporaryContainerMenuItem);

    newNormalContainerMenuItem.addEventListener('click', () => {
      this._popupRenderer.modalRenderer.showNewContainerPanelAsync().then((result) => {
        if (!result) return;
        console.log('Created new container', result);
      }).catch((e) => {
        console.error(e);
      });
    });

    newTemporaryContainerMenuItem.addEventListener('click', () => {
      this._temporaryContainerService.createTemporaryContainer().then((identity) => {
        console.debug('Created temporary container', identity);
      }).catch((e) => {
        console.error(e);
      });
    });

    // TODO: add i18n string
    const labelText = this.getLabelText();
    topBarElement.headingText = `${labelText} (${this._containerCount.toFixed(0)})`;
  }

  public render(browserState: BrowserStateDao): void {
    this._containerCount = browserState.displayedContainers.length;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
    const tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
    const displayedContainers = browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
    const fragment = this.getFragment();
    const activeContainersElement = fragment.querySelector('.active-containers') as HTMLDivElement;
    const inactiveContainersElement = fragment.querySelector('.inactive-containers') as HTMLDivElement;
    activeContainersElement.textContent = '';
    inactiveContainersElement.textContent = '';
    const privateContainers = displayedContainers.filter((container) => container.cookieStore.isPrivate);
    const normalContainers = displayedContainers.filter((container) => !container.cookieStore.isPrivate);
    const privateUserContexts = [... privateContainers];
    const normalUserContexts = [... normalContainers].sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
    });
    const userContextMap = new Map<string, DisplayedContainer>();
    for (const normalUserContext of normalUserContexts) {
      userContextMap.set(normalUserContext.cookieStore.id, normalUserContext);
    }
    const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType;
    this.renderPrivateContainers(browserState, privateUserContexts, activeContainersElement);
    this.renderSupergroup(0, rootSupergroup, browserState, userContextMap, activeContainersElement);
  }

  private renderSupergroup(nestingCount: number, supergroup: SupergroupType, browserState: BrowserStateDao, userContextMap: Map<string, DisplayedContainer>, parentElement: HTMLElement) {
    let tabCount = 0;
    const tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
    const tabGroupIds = supergroup.members;
    for (const tabGroupId of tabGroupIds) {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        const cookieStore = attributes.cookieStore as CookieStore;
        const userContext = userContextMap.get(tabGroupId);
        if (!userContext) continue;
        const isPrivate = cookieStore.isPrivate;
        const tabIds = browserState.tabIdsByContainer[userContext.cookieStore.id] ?? [];
        const tabs = this._indexTabService.filterOutIndexTabs(tabIds.map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao)));
        const containerElement = this._popupRenderer.renderPartialContainerElement(userContext, isPrivate);
        containerElement.tabCount = tabs.length;
        tabCount += tabs.length;
        if (tabs.length < 1) {
          containerElement.style.opacity = '0.75';
        }
        parentElement.appendChild(containerElement);

        containerElement.onContainerClose.addListener(async () => {
          const cookieStoreId = userContext.cookieStore.id;
          const tabs = await this._tabQueryService.queryTabs({
            tabGroupId: cookieStoreId,
            pinned: false,
          });
          await this._tabService.closeTabs(tabs);
        });

        containerElement.onContainerClick.addListener(() => {
          this.onContainerSelected.dispatch(userContext.cookieStore.id);
        });
      } else {
        const supergroup = tabGroupDirectorySnapshot.getSupergroup(tabGroupId) as SupergroupType;
        const supergroupElement = new MenulistSupergroupElement();
        supergroupElement.groupName = supergroup.name;
        parentElement.appendChild(supergroupElement);

        const subTabCount = this.renderSupergroup(nestingCount + 1, supergroup, browserState, userContextMap, supergroupElement);
        supergroupElement.tabCount = subTabCount;
        supergroupElement.groupHideButton.disabled = true;
        supergroupElement.groupUnhideButton.disabled = true;
        tabCount += subTabCount;

        supergroupElement.onGroupOptionsClick.addListener(() => {
          this._popupRenderer.currentWindowRenderer.renderSupergroupOptions(supergroup);
        });

        supergroupElement.onGroupClose.addListener(() => {
          this._supergroupService.closeUnpinnedSupergroupTabs(tabGroupId).catch((e) => {
            console.error(e);
          });
        })
      }
    }
    return tabCount;
  }

  private renderPrivateContainers(browserState: BrowserStateDao, userContexts: DisplayedContainer[], parentElement: HTMLElement) {
    for (const userContext of userContexts) {
      const isPrivate = userContext.cookieStore.isPrivate;
      const tabIds = browserState.tabIdsByContainer[userContext.cookieStore.id] ?? [];
      const tabs = tabIds.map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao));
      const containerElement = this._popupRenderer.renderPartialContainerElement(userContext, isPrivate);
      containerElement.tabCount = tabs.length;
      parentElement.appendChild(containerElement);

      containerElement.onContainerClose.addListener(async () => {
        const cookieStoreId = userContext.cookieStore.id;
        const tabs = await this._tabQueryService.queryTabs({
          tabGroupId: cookieStoreId,
          pinned: false,
        });
        await this._tabService.closeTabs(tabs);
      });

      containerElement.onContainerClick.addListener(() => {
        this.onContainerSelected.dispatch(userContext.cookieStore.id);
      });
    }
  }

  public override getFocusableElements(): HTMLElement[] {
    const fragment = this.getFragment();
    const activeContainersElement = fragment.querySelector('.active-containers') as HTMLDivElement;
    const inactiveContainersElement = fragment.querySelector('.inactive-containers') as HTMLDivElement;
    const activeContainers = Array.from(activeContainersElement.querySelectorAll('menulist-container'));
    const inactiveContainers = Array.from(inactiveContainersElement.querySelectorAll('menulist-container'));
    return [... activeContainers, ... inactiveContainers] as HTMLElement[];
  }
}
