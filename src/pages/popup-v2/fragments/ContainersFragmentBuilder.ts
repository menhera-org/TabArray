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
import { CookieStore } from "weeg-containers";
import { EventSink } from "weeg-events";

import { TemporaryContainerService } from "../../../lib/tabGroups/TemporaryContainerService";
import { SupergroupType, TabGroupDirectory } from "../../../lib/tabGroups/TabGroupDirectory";
import { TabGroupAttributes } from "../../../lib/tabGroups/TabGroupAttributes";
import { SupergroupService } from "../../../lib/tabGroups/SupergroupService";
import { TabQueryService } from "../../../lib/tabs/TabQueryService";
import { TabService } from "../../../lib/tabs/TabService";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../../components/ctg/ctg-menu-item";
import { MenulistSupergroupElement } from "../../../components/menulist-supergroup";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { PopupRendererService } from "../PopupRendererService";

import { ContainersStateSnapshot } from "../../../legacy-lib/tabs/ContainersStateSnapshot";
import { UserContext } from "../../../legacy-lib/tabGroups/UserContext";

export class ContainersFragmentBuilder extends AbstractFragmentBuilder {
  public readonly onContainerSelected = new EventSink<string>();

  private _containerCount = 0;
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _temporaryContainerService = TemporaryContainerService.getInstance();
  private readonly _supergroupService = SupergroupService.getInstance();
  private readonly _tabQueryService = TabQueryService.getInstance();
  private readonly _tabService = TabService.getInstance();

  public getFragmentId(): string {
    return 'fragment-containers';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemMain');
  }

  public getIconUrl(): string {
    return '/img/material-icons/folder.svg';
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
    newContainerMenuItem.iconSrc = '/img/firefox-icons/add.svg';
    topBarElement.addMenuItem('new-container', newContainerMenuItem);

    const newNormalContainerMenuItem = new CtgMenuItemElement();
    newNormalContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newNormalContainerMenuItem.iconSrc = '/img/firefox-icons/add.svg';
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

  public render(containersStateSnapshot: ContainersStateSnapshot): void {
    this._containerCount = containersStateSnapshot.displayedContainers.length;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
    const tabGroupDirectorySnapshot = containersStateSnapshot.tabGroupDirectorySnapshot;
    const fragment = this.getFragment();
    const activeContainersElement = fragment.querySelector('.active-containers') as HTMLDivElement;
    const inactiveContainersElement = fragment.querySelector('.inactive-containers') as HTMLDivElement;
    activeContainersElement.textContent = '';
    inactiveContainersElement.textContent = '';
    const privateContainers = containersStateSnapshot.displayedContainers.filter((container) => container.cookieStore.isPrivate);
    const normalContainers = containersStateSnapshot.displayedContainers.filter((container) => !container.cookieStore.isPrivate);
    const privateUserContexts = privateContainers.map((container) => UserContext.fromDisplayedContainer(container));
    const normalUserContexts = normalContainers.map((container) => UserContext.fromDisplayedContainer(container)).sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStoreId, b.cookieStoreId);
    });
    const userContextMap = new Map<string, UserContext>();
    for (const normalUserContext of normalUserContexts) {
      userContextMap.set(normalUserContext.cookieStoreId, normalUserContext);
    }
    const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupDirectory.getRootSupergroupId()) as SupergroupType;
    this.renderContainers(containersStateSnapshot, privateUserContexts, activeContainersElement);
    this.renderSupergroup(0, rootSupergroup, containersStateSnapshot, userContextMap, activeContainersElement);
  }

  private renderSupergroup(nestingCount: number, supergroup: SupergroupType, containersStateSnapshot: ContainersStateSnapshot, userContextMap: Map<string, UserContext>, parentElement: HTMLElement) {
    let tabCount = 0;
    const tabGroupDirectorySnapshot = containersStateSnapshot.tabGroupDirectorySnapshot;
    const tabGroupIds = supergroup.members;
    for (const tabGroupId of tabGroupIds) {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        const cookieStore = attributes.cookieStore as CookieStore;
        const userContext = userContextMap.get(tabGroupId);
        if (!userContext) continue;
        const isPrivate = cookieStore.isPrivate;
        const tabs = containersStateSnapshot.getTabsByContainer(cookieStore.id);
        const containerElement = this._popupRenderer.renderPartialContainerElement(userContext, isPrivate);
        containerElement.tabCount = tabs.length;
        tabCount += tabs.length;
        if (tabs.length < 1) {
          containerElement.style.opacity = '0.75';
        }
        parentElement.appendChild(containerElement);

        containerElement.onContainerClose.addListener(async () => {
          const cookieStoreId = userContext.cookieStoreId;
          const tabs = await this._tabQueryService.queryTabs({
            tabGroupId: cookieStoreId,
            pinned: false,
          });
          await this._tabService.closeTabs(tabs);
        });

        containerElement.onContainerClick.addListener(() => {
          this.onContainerSelected.dispatch(userContext.cookieStoreId);
        });
      } else {
        const supergroup = tabGroupDirectorySnapshot.getSupergroup(tabGroupId) as SupergroupType;
        const supergroupElement = new MenulistSupergroupElement();
        supergroupElement.groupName = supergroup.name;
        parentElement.appendChild(supergroupElement);

        const subTabCount = this.renderSupergroup(nestingCount + 1, supergroup, containersStateSnapshot, userContextMap, supergroupElement);
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

  private renderContainers(containersStateSnapshot: ContainersStateSnapshot, userContexts: UserContext[], parentElement: HTMLElement) {
    for (const userContext of userContexts) {
      const isPrivate = userContext.markedAsPrivate;
      const tabs = containersStateSnapshot.getTabsByContainer(userContext.cookieStoreId);
      const containerElement = this._popupRenderer.renderPartialContainerElement(userContext, isPrivate);
      containerElement.tabCount = tabs.length;
      parentElement.appendChild(containerElement);

      containerElement.onContainerClose.addListener(async () => {
        const cookieStoreId = userContext.cookieStoreId;
        const tabs = await this._tabQueryService.queryTabs({
          tabGroupId: cookieStoreId,
          pinned: false,
        });
        await this._tabService.closeTabs(tabs);
      });

      containerElement.onContainerClick.addListener(() => {
        this.onContainerSelected.dispatch(userContext.cookieStoreId);
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
