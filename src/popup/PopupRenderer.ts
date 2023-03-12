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

import { Tab } from "../frameworks/tabs";
import { UserContext } from "../frameworks/tabGroups";
import { MenulistTabElement } from "../components/menulist-tab";
import { MenulistContainerElement } from "../components/menulist-container";
import * as containers from '../modules/containers';
import { OriginAttributes } from "../frameworks/tabGroups";
import { TabGroup } from "../frameworks/tabGroups";
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { IndexTab } from "../modules/IndexTab";
import { PopupCurrentWindowRenderer } from "./PopupCurrentWindowRenderer";
import { PopupWindowListRenderer } from "./PopupWindowListRenderer";
import { PopupSiteListRenderer } from "./PopupSiteListRenderer";
import { Uint32 } from "../frameworks/types";
import { UserContextService } from '../userContexts/UserContextService';
import { PopupModalRenderer } from './PopupModalRenderer';
import { MessagingService } from "../frameworks/extension/MessagingService";
import browser from 'webextension-polyfill';

enum ContainerTabsState {
  NO_TABS,
  HIDDEN_TABS,
  VISIBLE_TABS,
}

// This needs some refactoring.
export class PopupRenderer {
  private readonly _userContextVisibilityService = UserContextVisibilityService.getInstance();
  private readonly _userContextService = UserContextService.getInstance();
  private readonly _messagingService = MessagingService.getInstance();

  public readonly currentWindowRenderer = new PopupCurrentWindowRenderer(this);
  public readonly windowListRenderer = new PopupWindowListRenderer(this);
  public readonly siteListRenderer = new PopupSiteListRenderer(this);
  public readonly modalRenderer = new PopupModalRenderer(this);

  public renderTab(tab: Tab, userContext: UserContext = UserContext.DEFAULT): MenulistTabElement {
    const element = new MenulistTabElement(tab, userContext);
    element.onTabClicked.addListener(() => {
      tab.focus();
    });
    element.onClose.addListener(() => {
      tab.close();
    });
    element.onPin.addListener(() => {
      tab.pin();
    });
    element.onUnpin.addListener(() => {
      tab.unpin();
    });
    return element;
  }

  private createContainerElement(userContext: UserContext, isPrivate = false): MenulistContainerElement {
    userContext = this._userContextService.fillDefaultValues(userContext);
    const element = new MenulistContainerElement(userContext, isPrivate);

    element.onContainerOptionsClick.addListener(async () => {
      this.modalRenderer.showContainerOptionsPanelAsync(userContext, isPrivate);
    });

    return element;
  }

  public renderPartialContainerElement(userContext: UserContext = UserContext.DEFAULT, isPrivate = false): MenulistContainerElement {
    const element = this.createContainerElement(userContext, isPrivate);
    element.containerVisibilityToggleButton.disabled = true;
    element.partialContainerView = true;
    return element;
  }

  private defineContainerCloseListenerForWindow(element: MenulistContainerElement, windowId: number, userContext: UserContext): void {
    element.onContainerClose.addListener(() => {
      console.log('Closing all unpinned tabs of window %d in userContext %d', windowId, userContext.id);
      containers.closeAllTabsOnWindow(userContext.id, windowId).catch((e) => {
        console.error(e);
      });
    });
  }

  public renderContainerForWindow(windowId: number, userContext: UserContext = UserContext.DEFAULT, isPrivate = false): MenulistContainerElement {
    const element = this.renderPartialContainerElement(userContext, isPrivate);
    this.defineContainerCloseListenerForWindow(element, windowId, userContext);
    return element;
  }

  public renderContainerForFirstPartyDomain(domain: string, userContext: UserContext = UserContext.DEFAULT, isPrivateBrowsing = false): MenulistContainerElement {
    const element = this.renderPartialContainerElement(userContext, isPrivateBrowsing);
    element.onContainerClose.addListener(() => {
      const originAttributes = new OriginAttributes(domain, userContext.id, (isPrivateBrowsing ? 1 : 0) as Uint32.Uint32);
      TabGroup.createTabGroup(originAttributes).then((tabGroup) => {
        return tabGroup.tabList.closeTabs();
      }).catch((e) => {
        console.error(e);
      });
    });
    // console.debug('element.containerVisibilityToggleButton.disabled', element.containerVisibilityToggleButton.disabled);
    return element;
  }

  private renderContainer(windowId: number, userContext: UserContext, isPrivate = false): MenulistContainerElement {
    userContext = this._userContextService.fillDefaultValues(userContext);
    const element = this.createContainerElement(userContext, isPrivate);
    this.defineContainerCloseListenerForWindow(element, windowId, userContext);
    element.onContainerHide.addListener(() => {
      this._userContextVisibilityService.hideContainerOnWindow(windowId, userContext.id).catch(() => {
        // ignore. (errors for private windows)
      });
    });
    element.onContainerUnhide.addListener(() => {
      this._userContextVisibilityService.showContainerOnWindow(windowId, userContext.id).catch(() => {
        // ignore. (errors for private windows)
      });
    });
    element.onContainerClick.addListener(async () => {
      await containers.openNewTabInContainer(userContext.id, windowId);
      window.close();
    });
    return element;
  }

  public renderContainerWithTabs(windowId: number, userContext: UserContext, tabs: Tab[], isPrivate = false): MenulistContainerElement {
    const element = this.renderContainer(windowId, userContext, isPrivate);
    let tabCount = 0;
    let state = ContainerTabsState.NO_TABS;
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        continue;
      }
      tabCount++;
      if (tab.hidden) {
        state = ContainerTabsState.HIDDEN_TABS;
        continue;
      }

      const tabElement = this.renderTab(tab, userContext);
      tabElement.draggable = true;
      tabElement.addEventListener('dragstart', (ev) => {
        if (!ev.dataTransfer) return;
        ev.dataTransfer.setData('application/json', JSON.stringify({
          type: 'tab',
          id: tab.id,
          index: tab.index,
          pinned: tab.pinned,
          cookieStoreId: tab.cookieStoreId,
        }));
        ev.dataTransfer.dropEffect = 'move';
      });
      tabElement.addEventListener('dragover', (ev) => {
        if (!ev.dataTransfer) return;
        const json = ev.dataTransfer.getData('application/json');
        const data = JSON.parse(json);
        if ('tab' != data.type || data.pinned) return;
        if (data.cookieStoreId != tab.cookieStoreId) return;
        ev.preventDefault();
      });
      tabElement.addEventListener('drop', (ev) => {
        if (!ev.dataTransfer) return;
        const json = ev.dataTransfer.getData('application/json');
        const data = JSON.parse(json);
        if ('tab' != data.type || data.pinned) return;
        if (data.cookieStoreId != tab.cookieStoreId) return;
        ev.preventDefault();
        browser.tabs.move(data.id, { index: tab.index }).catch((e) => {
          console.error(e);
        });
      });
      element.appendChild(tabElement);
      state = ContainerTabsState.VISIBLE_TABS;
    }
    if (state === ContainerTabsState.HIDDEN_TABS) {
      element.containerHidden = true;
    }
    element.tabCount = tabCount;
    element.addEventListener('dragover', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || data.pinned) return;
      if (data.cookieStoreId == userContext.cookieStoreId) return;
      ev.preventDefault();
    });
    element.addEventListener('drop', (ev) => {
      if (!ev.dataTransfer) return;
      const json = ev.dataTransfer.getData('application/json');
      const data = JSON.parse(json);
      if ('tab' != data.type || data.pinned) return;
      if (data.cookieStoreId == userContext.cookieStoreId) return;
      ev.preventDefault();
      this._messagingService.sendMessage('reopen_tab_in_container', {
        tabId: data.id,
        cookieStoreId: userContext.cookieStoreId,
      }).catch((e) => {
        console.error(e);
      });
    });
    return element;
  }
}
