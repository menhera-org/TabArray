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
import { Tab } from '../frameworks/tabs';
import { UserContext } from '../frameworks/tabGroups';
import { BrowserStateSnapshot } from '../frameworks/tabs/BrowserStateSnapshot';

export class PopupWindowListRenderer {
  private readonly _popupRenderer: PopupRenderer;

  public constructor(popupRenderer: PopupRenderer) {
    this._popupRenderer = popupRenderer;
  }

  public renderWindowLabel(windowId: number): MenulistWindowElement {
    const windowLabel = new MenulistWindowElement(windowId, false);
    windowLabel.onCloseButtonClicked.addListener(() => {
      browser.windows.remove(windowId).catch((e) => {
        console.error(e);
      });
    });
    windowLabel.onNameClicked.addListener(() => {
      browser.windows.update(windowId, { focused: true }).catch((e) => {
        console.error(e);
      });
    });
    return windowLabel;
  }

  public renderWindow(windowId: number, activeTab: Tab, userContext: UserContext, element: HTMLElement, isPrivate = false): void {
    const windowLabel = this.renderWindowLabel(windowId);
    element.appendChild(windowLabel);
    const containerElement = this._popupRenderer.renderContainerForWindow(windowId, userContext, isPrivate);
    element.appendChild(containerElement);
    const tabElement = this._popupRenderer.renderTab(activeTab, userContext);
    containerElement.appendChild(tabElement);
  }

  public renderWindowListView(browserStateSnapshot: BrowserStateSnapshot, definedUserContexts: readonly UserContext[], element: HTMLElement, headingElement: HTMLElement): void {
    element.textContent = '';
    const windowIds = [... browserStateSnapshot.getWindowIds()].sort((a, b) => a - b);
    const windowCount = windowIds.length;
    headingElement.textContent = browser.i18n.getMessage('windowsN', windowCount.toFixed(0));

    for (const windowId of windowIds) {
      const windowStateSnapshot = browserStateSnapshot.getWindowStateSnapshot(windowId);
      if (!windowStateSnapshot) {
        continue;
      }
      const tab = windowStateSnapshot.activeTabs[0];
      if (!tab) {
        continue;
      }
      const isPrivate = tab.isPrivate();
      const userContext = definedUserContexts.find((userContext) => userContext.id == tab.userContextId)
        ?? UserContext.createIncompleteUserContext(tab.userContextId);
      this.renderWindow(windowId, tab, userContext, element, isPrivate);
    }
  }
}
