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
import { Uint32 } from "weeg-types";
import { CookieStore } from 'weeg-containers';

import { TabGroupDirectorySnapshot } from '../tabGroups/TabGroupDirectorySnapshot';
import { SupergroupType, TabGroupDirectory } from '../tabGroups/TabGroupDirectory';
import { PopupRenderer } from './PopupRenderer';
import { MenulistWindowElement } from '../components/menulist-window';
import * as containers from '../modules/containers';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { OriginAttributes, UserContext, TabGroup } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { WindowStateSnapshot } from '../frameworks/tabs/WindowStateSnapshot';
import { MenulistContainerElement } from '../components/menulist-container';
import { MenulistSupergroupElement } from '../components/menulist-supergroup';
import { Tab } from '../frameworks/tabs';
import { TabGroupAttributes } from '../tabGroups/TabGroupAttributes';
import { ModalMenuElement } from '../components/modal-menu';
import { SupergroupEditorElement } from '../components/supergroup-editor';
import { ModalMoveGroupElement } from '../components/modal-move-group';
import { SupergroupService } from '../tabGroups/SupergroupService';

const tabGroupDirectory = new TabGroupDirectory();

export class PopupCurrentWindowRenderer {
  private readonly popupRenderer: PopupRenderer;
  private readonly userContextVisibilityService = UserContextVisibilityService.getInstance();
  private readonly supergroupService = SupergroupService.getInstance();
  private readonly _userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();

  public constructor(popupRenderer: PopupRenderer) {
    this.popupRenderer = popupRenderer;
  }

  /**
   * You should also set the tab count.
   */
  public renderCurrentWindowLabel(windowId: number): MenulistWindowElement {
    const windowLabel = new MenulistWindowElement(windowId, true);
    windowLabel.onCollapseButtonClicked.addListener(() => {
      containers.hideAll(windowId).catch((e) => {
        console.error(e);
      });
    });
    windowLabel.onExpandButtonClicked.addListener(() => {
      this.userContextVisibilityService.showAllOnWindow(windowId).catch((e) => {
        console.error(e);
      });
    });
    windowLabel.onCloseButtonClicked.addListener(() => {
      browser.windows.remove(windowId).catch((e) => {
        console.error(e);
      });
    });
    return windowLabel;
  }

  public renderMoreContainersLabel(): MenulistWindowElement {
    const moreContainersLabel = new MenulistWindowElement();
    moreContainersLabel.windowName = browser.i18n.getMessage('currentWindowMoreContainers');
    return moreContainersLabel;
  }

  /**
   *
   * @returns the number of pinned tabs.
   */
  public renderPinnedTabs(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: ReadonlyMap<Uint32.Uint32, UserContext>, element: HTMLElement): number {
    const pinnedTabs = windowStateSnapshot.pinnedTabs;
    let tabCount = 0;
    for (const tab of pinnedTabs) {
      const tabElement = this.popupRenderer.renderTab(tab, definedUserContexts.get(tab.userContextId));
      element.appendChild(tabElement);
      tabCount++;
    }
    return tabCount;
  }

  private async focusContainerOnWindow(windowId: number, userContextId: Uint32.Uint32, isPrivate: boolean): Promise<void> {
    if (isPrivate) {
      console.assert(userContextId === 0, 'Private windows should only have userContextId 0');
    }
    const tabGroup = isPrivate
      ? await TabGroup.createTabGroup(OriginAttributes.PRIVATE)
      : await UserContext.createIncompleteUserContext(userContextId).getTabGroup();
    const tabList = tabGroup.tabList;
    const tabs = (await tabList.getTabs()).filter((tab) => {
      return tab.windowId === windowId;
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

  private renderInactiveContainer(windowStateSnapshot: WindowStateSnapshot, userContext: UserContext): MenulistContainerElement {
    const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, userContext, [], windowStateSnapshot.isPrivate);
    return containerElement;
  }

  private renderOpenContainer(windowStateSnapshot: WindowStateSnapshot, userContext: UserContext, tabs: Tab[]): MenulistContainerElement {
    const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, userContext, tabs, windowStateSnapshot.isPrivate);
    containerElement.containerHighlightButtonEnabled = true;
    containerElement.onContainerHighlight.addListener(async () => {
      await this.focusContainerOnWindow(windowStateSnapshot.id, userContext.id, windowStateSnapshot.isPrivate);
      await containers.hideAll(windowStateSnapshot.id);
    });
    return containerElement;
  }

  private renderSupergroupOptions(supergroup: SupergroupType): void {
    const title = browser.i18n.getMessage('groupOptions', supergroup.name);
    const modalMenuElement = new ModalMenuElement(title);
    modalMenuElement.defineAction('edit', browser.i18n.getMessage('buttonEditGroup'), false);
    modalMenuElement.defineAction('delete', browser.i18n.getMessage('buttonDeleteGroup'), false);
    modalMenuElement.defineAction('move', browser.i18n.getMessage('moveContainer'), false);
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

        case 'done': {
          modalMenuElement.remove();
          break;
        }
      }
    });
  }

  private renderSupergroup(supergroup: SupergroupType, windowStateSnapshot: WindowStateSnapshot, definedUserContexts: UserContext[], tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, element: HTMLElement): number {
    let tabCount = 0;
    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
    const supergroupElement = new MenulistSupergroupElement();
    supergroupElement.groupName = supergroup.name;
    element.appendChild(supergroupElement);
    for (const memberTabGroupId of supergroup.members) {
      const tabGroupAttributes = new TabGroupAttributes(memberTabGroupId);
      if (tabGroupAttributes.tabGroupType == 'cookieStore') {
        const userContextId = (tabGroupAttributes.cookieStore as CookieStore).userContextId;
        const matchedUserContexts = definedUserContexts.filter((userContext) => {
          return userContext.id === userContextId;
        });
        if (matchedUserContexts.length === 0) continue;
        const openUserContext = matchedUserContexts[0] as UserContext;
        const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(userContextId) ?? []];
        tabCount += tabs.length;
        if (tabs.length == 0) {
          const containerElement = this.renderInactiveContainer(windowStateSnapshot, openUserContext);
          supergroupElement.appendChild(containerElement);
          continue;
        }
        const containerElement = this.renderOpenContainer(windowStateSnapshot, openUserContext, tabs);
        supergroupElement.appendChild(containerElement);
      } else {
        const supergroup = tabGroupDirectorySnapshot.getSupergroup(memberTabGroupId) as SupergroupType;
        tabCount += this.renderSupergroup(supergroup, windowStateSnapshot, [... definedUserContexts], tabGroupDirectorySnapshot, supergroupElement);
      }
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

  private getActiveTabGroupIds(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly UserContext[], tabGroupDirectorySnapshot: TabGroupDirectorySnapshot): Set<string> {
    const activeTabGroupIds = new Set<string>();
    const openUserContexts = definedUserContexts.filter((userContext) => {
      return windowStateSnapshot.activeUserContexts.includes(userContext.id);
    });
    for (const openUserContext of openUserContexts) {
      const cookieStoreId = openUserContext.cookieStoreId;
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
  public renderOpenContainers(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly UserContext[], element: HTMLElement, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot): number {
    const openUserContexts = definedUserContexts.filter((userContext) => {
      return windowStateSnapshot.activeUserContexts.includes(userContext.id);
    });

    let tabCount = 0;
    if (windowStateSnapshot.isPrivate) {
      for (const openUserContext of openUserContexts) {
        const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(openUserContext.id) ?? []];
        tabCount += tabs.length;
        const containerElement = this.renderOpenContainer(windowStateSnapshot, openUserContext, tabs);
        element.appendChild(containerElement);
      }
    } else {
      const activeTabGroupIds = this.getActiveTabGroupIds(windowStateSnapshot, definedUserContexts, tabGroupDirectorySnapshot);
      const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupDirectory.getRootSupergroupId()) as SupergroupType;
      for (const memberTabGroupId of rootSupergroup.members) {
        if (!activeTabGroupIds.has(memberTabGroupId)) continue;
        const tabGroupAttributes = new TabGroupAttributes(memberTabGroupId);
        if (tabGroupAttributes.tabGroupType == 'cookieStore') {
          const userContextId = (tabGroupAttributes.cookieStore as CookieStore).userContextId;
          const matchedUserContexts = definedUserContexts.filter((userContext) => {
            return userContext.id === userContextId;
          });
          if (matchedUserContexts.length === 0) continue;
          const openUserContext = matchedUserContexts[0] as UserContext;
          const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(userContextId) ?? []];
          tabCount += tabs.length;
          if (tabs.length == 0) {
            const containerElement = this.renderInactiveContainer(windowStateSnapshot, openUserContext);
            element.appendChild(containerElement);
            continue;
          }
          const containerElement = this.renderOpenContainer(windowStateSnapshot, openUserContext, tabs);
          element.appendChild(containerElement);
        } else {
          const supergroup = tabGroupDirectorySnapshot.getSupergroup(memberTabGroupId) as SupergroupType;
          tabCount += this.renderSupergroup(supergroup, windowStateSnapshot, [... definedUserContexts], tabGroupDirectorySnapshot, element);
        }
      }
    }
    return tabCount;
  }

  public renderInactiveContainers(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly UserContext[], element: HTMLElement, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot): void {
    const inactiveUserContexts = definedUserContexts.filter((userContext) => {
      return !windowStateSnapshot.activeUserContexts.includes(userContext.id);
    });

    if (windowStateSnapshot.isPrivate) {
      for (const inactiveUserContext of inactiveUserContexts) {
        const containerElement = this.renderInactiveContainer(windowStateSnapshot, inactiveUserContext);
        element.appendChild(containerElement);
      }
    } else {
      const activeTabGroupIds = this.getActiveTabGroupIds(windowStateSnapshot, definedUserContexts, tabGroupDirectorySnapshot);
      const rootSupergroup = tabGroupDirectorySnapshot.getSupergroup(TabGroupDirectory.getRootSupergroupId()) as SupergroupType;
      for (const memberTabGroupId of rootSupergroup.members) {
        if (activeTabGroupIds.has(memberTabGroupId)) continue;
        const tabGroupAttributes = new TabGroupAttributes(memberTabGroupId);
        if (tabGroupAttributes.tabGroupType == 'cookieStore') {
          const userContextId = (tabGroupAttributes.cookieStore as CookieStore).userContextId;
          const matchedUserContexts = definedUserContexts.filter((userContext) => {
            return userContext.id === userContextId;
          });
          if (matchedUserContexts.length === 0) continue;
          const openUserContext = matchedUserContexts[0] as UserContext;
          const containerElement = this.renderInactiveContainer(windowStateSnapshot, openUserContext);
          element.appendChild(containerElement);
        } else {
          const supergroup = tabGroupDirectorySnapshot.getSupergroup(memberTabGroupId) as SupergroupType;
          this.renderSupergroup(supergroup, windowStateSnapshot, [... definedUserContexts], tabGroupDirectorySnapshot, element);
        }
      }

    }
  }
}
