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
import { PopupRenderer } from './PopupRenderer';
import { MenulistWindowElement } from '../components/menulist-window';
import * as containers from '../modules/containers';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { OriginAttributes, UserContext, TabGroup } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';
import { WindowStateSnapshot } from '../frameworks/tabs/WindowStateSnapshot';
import { Uint32 } from '../frameworks/types';

export class PopupCurrentWindowRenderer {
  private readonly popupRenderer: PopupRenderer;
  private readonly userContextVisibilityService = UserContextVisibilityService.getInstance();
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

  /**
   *
   * @returns the number of tabs.
   */
  public renderOpenContainers(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly UserContext[], element: HTMLElement): number {
    const openUserContexts = definedUserContexts.filter((userContext) => {
      return windowStateSnapshot.activeUserContexts.includes(userContext.id);
    });

    let tabCount = 0;
    for (const openUserContext of openUserContexts) {
      const tabs = [... windowStateSnapshot.userContextUnpinnedTabMap.get(openUserContext.id) ?? []];
      tabCount += tabs.length;
      const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, openUserContext, tabs, windowStateSnapshot.isPrivate);
      containerElement.containerHighlightButtonEnabled = true;
      containerElement.onContainerHighlight.addListener(async () => {
        await this.focusContainerOnWindow(windowStateSnapshot.id, openUserContext.id, windowStateSnapshot.isPrivate);
        await containers.hideAll(windowStateSnapshot.id);
      });
      element.appendChild(containerElement);
    }
    return tabCount;
  }

  public renderInactiveContainers(windowStateSnapshot: WindowStateSnapshot, definedUserContexts: readonly UserContext[], element: HTMLElement): void {
    const inactiveUserContexts = definedUserContexts.filter((userContext) => {
      return !windowStateSnapshot.activeUserContexts.includes(userContext.id);
    });

    for (const inactiveUserContext of inactiveUserContexts) {
      const containerElement = this.popupRenderer.renderContainerWithTabs(windowStateSnapshot.id, inactiveUserContext, [], windowStateSnapshot.isPrivate);
      element.appendChild(containerElement);
    }
  }
}
