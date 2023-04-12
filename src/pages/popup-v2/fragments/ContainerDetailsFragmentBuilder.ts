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

import browser from "webextension-polyfill";
import { CookieStore, DisplayedContainer } from "weeg-containers";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../../components/ctg/ctg-menu-item";
import { PopupRendererService } from "../PopupRendererService";
import { BrowserStateSnapshot } from "../../../legacy-lib/tabs/BrowserStateSnapshot";
import { UserContext } from "../../../legacy-lib/tabGroups";
import { MenulistWindowElement } from "../../../components/menulist-window";
import { ContainerTabOpenerService } from "../../../lib/tabGroups/ContainerTabOpenerService";

export class ContainerDetailsFragmentBuilder extends AbstractFragmentBuilder {
  protected static override readonly suppressBottomNavigation = true;

  private readonly _containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private _containerName = browser.i18n.getMessage('noContainer');
  private _cookieStoreId = CookieStore.DEFAULT.id;
  private _browserStateSnapshot: BrowserStateSnapshot | null = null;
  private _selectedDisplayedContainer: DisplayedContainer | null = null;

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
      this._containerTabOpenerService.openNewTabInContainer(this._cookieStoreId, true).catch((e) => {
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
    let selectedDisplayedContainer: DisplayedContainer | null = null;
    for (const containerAttributes of containersStateSnapshot.displayedContainers) {
      if (containerAttributes.cookieStore.id === this._cookieStoreId) {
        selectedDisplayedContainer = containerAttributes;
        break;
      }
    }
    if (selectedDisplayedContainer == null) {
      return;
    }
    this._selectedDisplayedContainer = selectedDisplayedContainer;
    this._containerName = selectedDisplayedContainer.name;
  }

  public renderContainer(): void {
    if (this._browserStateSnapshot == null || this._selectedDisplayedContainer == null) {
      return;
    }

    const fragment = this.getFragment();
    fragment.textContent = '';
    const containersStateSnapshot = this._browserStateSnapshot.getContainersStateSnapshot();
    const tabs = containersStateSnapshot.getTabsByContainer(this._cookieStoreId);
    const userContext = UserContext.fromDisplayedContainer(this._selectedDisplayedContainer);
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

  public override getFocusableElements(): HTMLElement[] {
    return [... this.getFragment().querySelectorAll('menulist-tab')] as HTMLElement[];
  }
}
