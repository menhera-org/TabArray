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
import { CookieStore, DisplayedContainer } from "weeg-containers";

import { ContainerTabOpenerService } from "../../../lib/tabGroups/ContainerTabOpenerService";
import { BrowserStateDao } from "../../../lib/states/BrowserStateDao";
import { DisplayedContainerDao } from "../../../lib/states/DisplayedContainerDao";
import { TabDao } from "../../../lib/states/TabDao";

import { IndexTab } from "../../../legacy-lib/modules/IndexTab";

import { MenulistWindowElement } from "../../../components/menulist-window";
import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../../components/ctg/ctg-menu-item";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { PopupRendererService } from "../PopupRendererService";


export class ContainerDetailsFragmentBuilder extends AbstractFragmentBuilder {
  protected static override readonly suppressBottomNavigation = true;

  private readonly _containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private _containerName = browser.i18n.getMessage('noContainer');
  private _cookieStoreId = CookieStore.DEFAULT.id;
  private _browserState: BrowserStateDao | null = null;
  private _selectedDisplayedContainer: DisplayedContainer | null = null;

  public getFragmentId(): string {
    return 'fragment-container-details';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemMain');
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/folder.svg';
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
    newTabMenuItem.iconSrc = '/img/firefox-icons/plus.svg';
    topBarElement.addMenuItem('new-tab', newTabMenuItem);

    newTabMenuItem.addEventListener('click', () => {
      this._containerTabOpenerService.openNewTabInContainer(this._cookieStoreId, true).catch((e) => {
        console.error(e);
      });
    });

    topBarElement.headingText = this._containerName;
  }

  public render(browserState: BrowserStateDao): void {
    // todo
    this._browserState = browserState;
    this.setContainer();
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }

    this.renderContainer();
  }

  private setContainer(): void {
    if (this._browserState == null) {
      return;
    }
    const browserState = this._browserState;
    let selectedDisplayedContainer: DisplayedContainer | null = null;
    for (const displayedContainer of browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao))) {
      if (displayedContainer.cookieStore.id === this._cookieStoreId) {
        selectedDisplayedContainer = displayedContainer;
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
    if (this._browserState == null || this._selectedDisplayedContainer == null) {
      return;
    }

    const browserState = this._browserState;
    const fragment = this.getFragment();
    fragment.textContent = '';
    const tabIds = browserState.tabIdsByContainer[this._cookieStoreId] ?? [];
    const tabs = tabIds.map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao));
    const displayedContainer = this._selectedDisplayedContainer;
    let windowId: number = browser.windows.WINDOW_ID_NONE;
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        continue;
      }
      if (windowId != tab.windowId) {
        const windowElement = new MenulistWindowElement();
        windowElement.windowName = this._browserState.currentWindowId == tab.windowId
          ? browser.i18n.getMessage('currentWindow', tab.windowId.toString())
          : browser.i18n.getMessage('windowLabel', tab.windowId.toString());
        fragment.appendChild(windowElement);
      }
      windowId = tab.windowId;
      const tabElement = this._popupRenderer.renderTab(tab, displayedContainer);
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
