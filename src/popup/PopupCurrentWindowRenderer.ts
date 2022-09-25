// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
import { WindowUserContextList } from '../frameworks/tabGroups';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';

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
   * @param windowUserContextList
   * @param element
   * @returns the number of pinned tabs.
   */
  public renderPinnedTabs(windowUserContextList: WindowUserContextList, element: HTMLElement): number {
    const pinnedTabs = windowUserContextList.getPinnedTabs();
    let tabCount = 0;
    for (const tab of pinnedTabs) {
      const tabElement = this.popupRenderer.renderTab(tab, windowUserContextList.getUserContext(tab.userContextId));
      element.appendChild(tabElement);
      tabCount++;
    }
    return tabCount;
  }

  /**
   *
   * @param windowUserContextList
   * @param element
   * @returns the number of tabs.
   */
  public renderOpenContainers(windowUserContextList: WindowUserContextList, element: HTMLElement): number {
    const openUserContexts = this._userContextSortingOrderStore.sort([... windowUserContextList.getOpenUserContexts()]);
    let tabCount = 0;
    for (const openUserContext of openUserContexts) {
      const tabs = [... windowUserContextList.getUserContextTabs(openUserContext.id)];
      tabCount += tabs.length;
      const containerElement = this.popupRenderer.renderContainerWithTabs(windowUserContextList.windowId, openUserContext, tabs, windowUserContextList.isPrivate);
      element.appendChild(containerElement);
    }
    return tabCount;
  }

  public renderInactiveContainers(windowUserContextList: WindowUserContextList, element: HTMLElement): void {
    const inactiveUserContexts = this._userContextSortingOrderStore.sort([... windowUserContextList.getInactiveUserContexts()]);
    for (const inactiveUserContext of inactiveUserContexts) {
      const containerElement = this.popupRenderer.renderContainerWithTabs(windowUserContextList.windowId, inactiveUserContext, [], windowUserContextList.isPrivate);
      element.appendChild(containerElement);
    }
  }

  public renderCurrentWindowView(windowUserContextList: WindowUserContextList, element: HTMLElement): void {
    element.textContent = '';
    const currentWindowLabel = this.renderCurrentWindowLabel(windowUserContextList.windowId);
    element.appendChild(currentWindowLabel);
    let tabCount = 0;
    tabCount += this.renderPinnedTabs(windowUserContextList, element);
    tabCount += this.renderOpenContainers(windowUserContextList, element);
    currentWindowLabel.tabCountString = String(tabCount);
    if (!windowUserContextList.isPrivate) {
      element.appendChild(this.renderMoreContainersLabel());
      this.renderInactiveContainers(windowUserContextList, element);
    }
  }
}
