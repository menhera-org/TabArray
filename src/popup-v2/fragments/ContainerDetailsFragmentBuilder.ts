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

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { CtgFragmentElement } from "../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../components/ctg/ctg-menu-item";
import browser from "webextension-polyfill";
import { PopupRenderer } from "../../popup/PopupRenderer";
import { BrowserStateSnapshot } from "../../frameworks/tabs/BrowserStateSnapshot";
import { ContainerAttributes, CookieStore } from "../../frameworks/tabAttributes";
import { UserContext } from "../../frameworks/tabGroups";
import { MenulistWindowElement } from "../../components/menulist-window";
import { MessagingService } from "../../frameworks/extension/MessagingService";

export class ContainerDetailsFragmentBuilder extends AbstractFragmentBuilder {
  protected static override readonly suppressBottomNavigation = true;

  private readonly _messagingService = MessagingService.getInstance();
  private readonly _popupRenderer = new PopupRenderer();
  private _containerName = browser.i18n.getMessage('noContainer');
  private _cookieStoreId = CookieStore.DEFAULT.id;
  private _browserStateSnapshot: BrowserStateSnapshot | null = null;
  private _selectedContainerAttributes: ContainerAttributes | null = null;

  public getFragmentId(): string {
    return 'fragment-container-details';
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
    fragment.navigationGroup = 'fragment-containers';
    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = true;

    this.getFragment().onDeactivated.addListener(() => {
      topBarElement.backButtonEnabled = false;
    });

    const newTabMenuItem = new CtgMenuItemElement();
    newTabMenuItem.labelText = browser.i18n.getMessage('buttonOpenTabInContainer');
    newTabMenuItem.iconSrc = '/img/firefox-icons/add.svg';
    topBarElement.addMenuItem('new-tab', newTabMenuItem);

    newTabMenuItem.addEventListener('click', () => {
      this._messagingService.sendMessage('open_new_tab_in_container', {
        cookieStoreId: this._cookieStoreId,
        active: true,
      }).catch((e) => {
        console.error(e);
      });
    });

    topBarElement.headingText = this._containerName;
  }

  public render(browserStateSnapshot: BrowserStateSnapshot): void {
    // todo
    this._browserStateSnapshot = browserStateSnapshot;
    this.setContainer();
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }

    this.renderContainer();
  }

  private setContainer(): void {
    if (this._browserStateSnapshot == null) {
      return;
    }
    const containersStateSnapshot = this._browserStateSnapshot.getContainersStateSnapshot();
    let selectedContainerAttributes: ContainerAttributes | null = null;
    for (const containerAttributes of containersStateSnapshot.containerAttributesList) {
      if (containerAttributes.id === this._cookieStoreId) {
        selectedContainerAttributes = containerAttributes;
        break;
      }
    }
    if (selectedContainerAttributes == null) {
      return;
    }
    this._selectedContainerAttributes = selectedContainerAttributes;
    this._containerName = selectedContainerAttributes.name;
  }

  public renderContainer(): void {
    if (this._browserStateSnapshot == null || this._selectedContainerAttributes == null) {
      return;
    }

    const fragment = this.getFragment();
    fragment.textContent = '';
    const containersStateSnapshot = this._browserStateSnapshot.getContainersStateSnapshot();
    const tabs = containersStateSnapshot.getTabsByContainer(this._cookieStoreId);
    const userContext = UserContext.fromContainerAttributes(this._selectedContainerAttributes);
    let windowId: number = browser.windows.WINDOW_ID_NONE;
    for (const tab of tabs) {
      if (windowId != tab.windowId) {
        const windowElement = new MenulistWindowElement();
        windowElement.windowName = this._browserStateSnapshot.currentWindowId == tab.windowId
          ? browser.i18n.getMessage('currentWindow', tab.windowId.toString())
          : browser.i18n.getMessage('windowLabel', tab.windowId.toString());
        fragment.appendChild(windowElement);
      }
      windowId = tab.windowId;
      const tabElement = this._popupRenderer.renderTab(tab, userContext);
      fragment.appendChild(tabElement);
    }
  }

  public activate(cookieStoreId: string): void {
    this._cookieStoreId = cookieStoreId;
    this.setContainer();
    this.renderContainer();
    this.frameLayoutElement.activateFragment(this.getFragmentId());
  }
}
