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
import { Uint32 } from "weeg-types";
import { CookieStore, DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { TabGroupDirectorySnapshot } from '../../../lib/tabGroups/TabGroupDirectorySnapshot';
import { SupergroupType, TabGroupDirectory } from '../../../lib/tabGroups/TabGroupDirectory';
import { SupergroupService } from '../../../lib/tabGroups/SupergroupService';
import { TabGroupAttributes } from '../../../lib/tabGroups/TabGroupAttributes';
import { TabQueryService } from '../../../lib/tabs/TabQueryService';
import { TabAttributeMap } from '../../../lib/tabGroups/TabAttributeMap';
import { CompatConsole } from '../../../lib/console/CompatConsole';

import { PopupRenderer } from './PopupRenderer';

import { MenulistContainerElement } from '../../../components/menulist-container';
import { MenulistSupergroupElement } from '../../../components/menulist-supergroup';
import { ModalMenuElement } from '../../../components/modal-menu';
import { SupergroupEditorElement } from '../../../components/supergroup-editor';
import { ModalMoveGroupElement } from '../../../components/modal-move-group';
import { ContainerEditorElement } from '../../../components/container-editor';

import * as containers from '../../../legacy-lib/modules/containers';
import { WindowStateSnapshot } from '../../../legacy-lib/tabs/WindowStateSnapshot';

const tabGroupDirectory = new TabGroupDirectory();

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class PopupCurrentWindowRenderer {
  private readonly popupRenderer: PopupRenderer;
  private readonly supergroupService = SupergroupService.getInstance();
  private readonly tabQueryService = TabQueryService.getInstance();

  public constructor(popupRenderer: PopupRenderer) {
    this.popupRenderer = popupRenderer;
  }

  /**
   *
   * @returns the number of pinned tabs.
   */
  public renderPinnedTabs(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: ReadonlyMap<Uint32.Uint32, DisplayedContainer>, element: HTMLElement): number {
    const pinnedTabs = windowStateSnapshot.pinnedTabs;
    let tabCount = 0;
    for (const tab of pinnedTabs) {
      const userContext = definedUserContexts.get(tab.cookieStore.userContextId);
      if (!userContext) {
        console.error('Could not find userContext for tab', tab);
        continue;
      }
      const tabElement = this.popupRenderer.renderTab(tab, userContext);
      element.appendChild(tabElement);
      tabCount++;
    }
    return tabCount;
  }

  private async focusContainerOnWindow(windowId: number, userContextId: Uint32.Uint32, isPrivate: boolean): Promise<void> {
    if (isPrivate) {
      console.assert(userContextId === 0, 'Private windows should only have userContextId 0');
    }
    const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : CookieStore.fromParams({
      userContextId,
      privateBrowsingId: 0 as Uint32.Uint32,
    }).id;
    const tabs = await this.tabQueryService.queryTabs({
      tabGroupId: cookieStoreId,
      windowId,
    });
    if (tabs.length === 0) {
      return;
    }
    const lastAccessedTab = tabs.reduce((a, b) => {
      if (a.pinned && !b.pinned) {
        return b;
      } else if (!a.pinned && b.pinned) {
        return a;
      }
      return a.lastAccessed > b.lastAccessed ? a : b;
    });
    lastAccessedTab.focus();
  }

  private renderInactiveContainer(windowStateSnapshot: WindowStateSnapshot, displayedContainer: DisplayedContainer): MenulistContainerElement {
    const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, displayedContainer, [], windowStateSnapshot.isPrivate);
    return containerElement;
  }

  private renderOpenContainer(windowStateSnapshot: WindowStateSnapshot, displayedContainer: DisplayedContainer, tabs: CompatTab[], tabAttributeMap: TabAttributeMap): MenulistContainerElement {
    const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, displayedContainer, tabs, windowStateSnapshot.isPrivate, tabAttributeMap);
    containerElement.containerHighlightButtonEnabled = true;
    containerElement.onContainerHighlight.addListener(async () => {
      await this.focusContainerOnWindow(windowStateSnapshot.id, displayedContainer.cookieStore.userContextId, windowStateSnapshot.isPrivate);
      await containers.hideAll(windowStateSnapshot.id);
    });
    return containerElement;
  }

  public renderSupergroupOptions(supergroup: SupergroupType): void {
    const title = browser.i18n.getMessage('groupOptions', supergroup.name);
    const modalMenuElement = new ModalMenuElement(title);
    modalMenuElement.defineAction('edit', browser.i18n.getMessage('buttonEditGroup'), false);
    modalMenuElement.defineAction('delete', browser.i18n.getMessage('buttonDeleteGroup'), false);
    modalMenuElement.defineAction('move', browser.i18n.getMessage('moveContainer'), false);
    modalMenuElement.defineAction('create-container', browser.i18n.getMessage('buttonNewContainer'), false);
    modalMenuElement.defineAction('create-temporary-container', browser.i18n.getMessage('buttonNewTemporaryContainer'), false);
    modalMenuElement.defineAction('done', browser.i18n.getMessage('buttonDone'), true);
    document.body.appendChild(modalMenuElement);
    modalMenuElement.onActionClicked.addListener(async (action) => {
      switch (action) {
        case 'edit': {
          modalMenuElement.remove();
          const groupEditorElement = new SupergroupEditorElement(supergroup);
          document.body.appendChild(groupEditorElement);
          break;
        }

        case 'delete': {
          modalMenuElement.remove();
          const answer = await this.popupRenderer.modalRenderer.confirmAsync(browser.i18n.getMessage('confirmGroupDelete', supergroup.name));
          if (answer) {
            await tabGroupDirectory.removeSupergroup(TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId));
          }
          break;
        }

        case 'move': {
          modalMenuElement.remove();
          const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
          const modalMoveElement = new ModalMoveGroupElement(tabGroupId);
          document.body.appendChild(modalMoveElement);
          break;
        }

        case 'create-container': {
          modalMenuElement.remove();
          const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
          const containerEditorElement = new ContainerEditorElement(undefined, tabGroupId);
          document.body.appendChild(containerEditorElement);
          break;
        }

        case 'create-temporary-container': {
          modalMenuElement.remove();
          const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
          const contextualIdentity = await this.supergroupService.createChildTemporaryContainer(tabGroupId);
          console.debug('Created temporary container', contextualIdentity);
          break;
        }

        case 'done': {
          modalMenuElement.remove();
          break;
        }
      }
    });
  }

  private renderSupergroupContainer(element: HTMLElement, tabGroupId: string, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, windowStateSnapshot: WindowStateSnapshot, tabAttributeMap: TabAttributeMap, definedDisplayedContainers: readonly DisplayedContainer[]): number {
    let tabCount = 0;
    const tabGroupAttributes = new TabGroupAttributes(tabGroupId);
    if (tabGroupAttributes.tabGroupType == 'cookieStore') {
      const cookieStore = tabGroupAttributes.cookieStore as CookieStore;
      const cookieStoreId = cookieStore.id;
      const userContextId = cookieStore.userContextId;
      const matchedDisplayedContainers = definedDisplayedContainers.filter((displayedContainer) => {
        return displayedContainer.cookieStore.id === cookieStoreId;
      });
      if (matchedDisplayedContainers.length === 0) return tabCount;
      const openDisplayedContainer = matchedDisplayedContainers[0] as DisplayedContainer;
      const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(userContextId) ?? []];
      tabCount += tabs.length;
      if (tabs.length == 0) {
        const containerElement = this.renderInactiveContainer(windowStateSnapshot, openDisplayedContainer);
        element.appendChild(containerElement);
        return tabCount;
      }
      const containerElement = this.renderOpenContainer(windowStateSnapshot, openDisplayedContainer, tabs, tabAttributeMap);
      element.appendChild(containerElement);
    } else {
      const supergroup = tabGroupDirectorySnapshot.getSupergroup(tabGroupId) as SupergroupType;
      tabCount += this.renderSupergroup(supergroup, windowStateSnapshot, [... definedDisplayedContainers], tabGroupDirectorySnapshot, element, tabAttributeMap);
    }
    return tabCount;
  }

  private renderSupergroup(supergroup: SupergroupType, windowStateSnapshot: WindowStateSnapshot, definedDisplayedContainers: readonly DisplayedContainer[], tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, element: HTMLElement, tabAttributeMap: TabAttributeMap): number {
    let tabCount = 0;
    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
    const supergroupElement = new MenulistSupergroupElement();
    supergroupElement.groupName = supergroup.name;
    element.appendChild(supergroupElement);
    for (const memberTabGroupId of supergroup.members) {
      tabCount += this.renderSupergroupContainer(supergroupElement, memberTabGroupId, tabGroupDirectorySnapshot, windowStateSnapshot, tabAttributeMap, definedDisplayedContainers);
    }
    supergroupElement.tabCount = tabCount;
    supergroupElement.onGroupOptionsClick.addListener(() => {
      this.renderSupergroupOptions(supergroup);
    });
    supergroupElement.onGroupHide.addListener(() => {
      this.supergroupService.hideSupergroupOnWindow(tabGroupId, windowStateSnapshot.id).catch((e) => {
        console.error(e);
      });
    });
    supergroupElement.onGroupUnhide.addListener(() => {
      this.supergroupService.showSupergroupOnWindow(tabGroupId, windowStateSnapshot.id).catch((e) => {
        console.error(e);
      });
    });
    supergroupElement.onGroupClose.addListener(() => {
      this.supergroupService.closeUnpinnedSupergroupTabsOnWindow(tabGroupId, windowStateSnapshot.id).catch((e) => {
        console.error(e);
      });
    });
    return tabCount;
  }

  private getActiveTabGroupIds(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly DisplayedContainer[], tabGroupDirectorySnapshot: TabGroupDirectorySnapshot): Set<string> {
    const activeTabGroupIds = new Set<string>();
    const openUserContexts = definedUserContexts.filter((userContext) => {
      return windowStateSnapshot.activeUserContexts.includes(userContext.cookieStore.userContextId);
    });
    for (const openUserContext of openUserContexts) {
      const cookieStoreId = openUserContext.cookieStore.id;
      let parentTabGroupId: string | undefined = cookieStoreId;
      while (parentTabGroupId != null && !activeTabGroupIds.has(parentTabGroupId)) {
        activeTabGroupIds.add(parentTabGroupId);
        parentTabGroupId = tabGroupDirectorySnapshot.getParentTabGroupId(parentTabGroupId);
      }
    }
    return activeTabGroupIds;
  }

  /**
   *
   * @returns the number of tabs.
   */
  public renderOpenContainers(windowStateSnapshot: WindowStateSnapshot, definedDisplayedContainers: readonly DisplayedContainer[], element: HTMLElement, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, tabAttributeMap: TabAttributeMap): number {
    const openUserContexts = definedDisplayedContainers.filter((userContext) => {
      return windowStateSnapshot.activeUserContexts.includes(userContext.cookieStore.userContextId);
    });

    let tabCount = 0;
    if (windowStateSnapshot.isPrivate) {
      for (const openUserContext of openUserContexts) {
        const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(openUserContext.cookieStore.userContextId) ?? []];
        tabCount += tabs.length;
        const containerElement = this.renderOpenContainer(windowStateSnapshot, openUserContext, tabs, tabAttributeMap);
        element.appendChild(containerElement);
      }
    } else {
      const activeTabGroupIds = this.getActiveTabGroupIds(windowStateSnapshot, definedDisplayedContainers, tabGroupDirectorySnapshot);
      const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType;
      for (const memberTabGroupId of rootSupergroup.members) {
        if (!activeTabGroupIds.has(memberTabGroupId)) continue;
        tabCount += this.renderSupergroupContainer(element, memberTabGroupId, tabGroupDirectorySnapshot, windowStateSnapshot, tabAttributeMap, definedDisplayedContainers);
      }
    }
    return tabCount;
  }

  public renderInactiveContainers(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly DisplayedContainer[], element: HTMLElement, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, tabAttributeMap: TabAttributeMap): void {
    const inactiveUserContexts = definedUserContexts.filter((userContext) => {
      return !windowStateSnapshot.activeUserContexts.includes(userContext.cookieStore.userContextId);
    });

    if (windowStateSnapshot.isPrivate) {
      for (const inactiveUserContext of inactiveUserContexts) {
        const containerElement = this.renderInactiveContainer(windowStateSnapshot, inactiveUserContext);
        element.appendChild(containerElement);
      }
    } else {
      const activeTabGroupIds = this.getActiveTabGroupIds(windowStateSnapshot, definedUserContexts, tabGroupDirectorySnapshot);
      const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType;
      for (const memberTabGroupId of rootSupergroup.members) {
        if (activeTabGroupIds.has(memberTabGroupId)) continue;
        const tabGroupAttributes = new TabGroupAttributes(memberTabGroupId);
        if (tabGroupAttributes.tabGroupType == 'cookieStore') {
          const cookieStore = tabGroupAttributes.cookieStore as CookieStore;
          const cookieStoreId = cookieStore.id;
          const matchedUserContexts = definedUserContexts.filter((userContext) => {
            return userContext.cookieStore.id === cookieStoreId;
          });
          if (matchedUserContexts.length === 0) continue;
          const openUserContext = matchedUserContexts[0] as DisplayedContainer;
          const containerElement = this.renderInactiveContainer(windowStateSnapshot, openUserContext);
          element.appendChild(containerElement);
        } else {
          const supergroup = tabGroupDirectorySnapshot.getSupergroup(memberTabGroupId) as SupergroupType;
          this.renderSupergroup(supergroup, windowStateSnapshot, [... definedUserContexts], tabGroupDirectorySnapshot, element, tabAttributeMap);
        }
      }

    }
  }
}
