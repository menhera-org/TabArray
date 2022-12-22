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
import { Tab, WindowService } from "../frameworks/tabs";
import { FirstPartyTabMap, UserContext, WindowUserContextList } from "../frameworks/tabGroups";
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
import { PopupUtils } from './PopupUtils';
import { PopupModalRenderer } from './PopupModalRenderer';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';

enum ContainerTabsState {
  NO_TABS,
  HIDDEN_TABS,
  VISIBLE_TABS,
}

// This needs some refactoring.
export class PopupRenderer {
  private _userContextVisibilityService = UserContextVisibilityService.getInstance();
  private _userContextService = UserContextService.getInstance();
  private readonly _utils = new PopupUtils();

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
    const element = new MenulistContainerElement(userContext);

    element.onContainerOptionsClick.addListener(async () => {
      this.modalRenderer.showContainerOptionsPanelAsync(userContext, isPrivate);
    });

    return element;
  }

  private renderPartialContainerElement(userContext: UserContext = UserContext.DEFAULT, isPrivate = false): MenulistContainerElement {
    const element = this.createContainerElement(userContext, isPrivate);
    element.containerVisibilityToggleButton.disabled = true;
    return element;
  }

  private defineContainerCloseListenerForWindow(element: MenulistContainerElement, windowId: number, userContext: UserContext): void {
    element.onContainerClose.addListener(() => {
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

      element.appendChild(this.renderTab(tab, userContext));
      state = ContainerTabsState.VISIBLE_TABS;
    }
    if (state === ContainerTabsState.HIDDEN_TABS) {
      element.containerHidden = true;
    }
    element.tabCount = tabCount;
    return element;
  }

  public async render() {
    const startTime = Date.now();
    const browserWindow = await browser.windows.get(browser.windows.WINDOW_ID_CURRENT);
    const windowId = browserWindow.id;
    if (null == windowId) {
      console.warn('windowId is null');
      return;
    }
    const currentWindowMenuList = this._utils.queryElementNonNull<HTMLElement>('#menuList');
    const windowListMenuList = this._utils.queryElementNonNull<HTMLElement>('#windowMenuList');
    const sitesMenuList = this._utils.queryElementNonNull<HTMLElement>('#sites-pane-top');
    const windowService = WindowService.getInstance();
    const [windowUserContextList, activeTabsByWindow, firstPartyTabMap] = await Promise.all([
      WindowUserContextList.create(windowId),
      windowService.getActiveTabsByWindow(),
      FirstPartyTabMap.create(browserWindow.incognito),
      UserContextSortingOrderStore.getInstance().initialized,
      this.siteListRenderer.rerenderSiteDetailsView(),
    ]);
    this.currentWindowRenderer.renderCurrentWindowView(windowUserContextList, currentWindowMenuList);
    this.windowListRenderer.renderWindowListView(activeTabsByWindow, windowListMenuList);
    this.siteListRenderer.renderSiteListView(firstPartyTabMap, sitesMenuList);
    const elapsed = Date.now() - startTime;
    if (elapsed > 500) {
      console.debug(`rendering took ${elapsed}ms`);
    }
  }
}
