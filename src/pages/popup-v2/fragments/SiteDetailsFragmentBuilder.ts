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
import { SetMap } from "weeg-types";
import { CompatTab } from "weeg-tabs";
import { DisplayedContainer } from "weeg-containers";

import { BrowserStateDao } from "../../../lib/states/BrowserStateDao";
import { DisplayedContainerDao } from "../../../lib/states/DisplayedContainerDao";
import { TabGroupDirectorySnapshot } from "../../../lib/tabGroups/TabGroupDirectorySnapshot";
import { TabDao } from "../../../lib/states/TabDao";
import { IndexTabService } from "../../../lib/tabs/IndexTabService";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { PopupRendererService } from "../PopupRendererService";

export class SiteDetailsFragmentBuilder extends AbstractFragmentBuilder {
  protected static override readonly suppressBottomNavigation = true;

  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private readonly _indexTabService = IndexTabService.getInstance();

  private _domain = '(none)';
  private _tabCount = 0;
  private _browserState: BrowserStateDao | null = null;
  private _definedDisplayedContainers: DisplayedContainer[] = [];
  private _tabs: CompatTab[] = [];

  public getFragmentId(): string {
    return 'fragment-site-details';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemSites');
  }

  public getIconUrl(): string {
    return '/img/firefox-icons/defaultFavicon.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    fragment.navigationGroup = 'fragment-sites';
    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.backButtonEnabled = true;

    this.getFragment().onDeactivated.addListener(() => {
      topBarElement.backButtonEnabled = false;
    });

    topBarElement.headingText = `${this._domain || '(null)'} (${this._tabCount})`;
  }

  public render(browserState: BrowserStateDao): void {
    this._browserState = browserState;
    this.setSite();
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }

    this.renderSite();
  }

  private setSite(): void {
    if (this._browserState == null) {
      return;
    }
    const browserState = this._browserState;
    const tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
    const displayedContainers = browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
    this._definedDisplayedContainers = [... displayedContainers].sort((a, b) => {
      return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id);
    });
    const tabIds = browserState.tabIdsBySite[this._domain] ?? [];
    const tabs = this._indexTabService.filterOutIndexTabs(tabIds.map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao)));
    this._tabCount = tabs.length;
    this._tabs = [... tabs];
  }

  public renderSite(): void {
    if (this._browserState == null) {
      return;
    }
    const tabsByUserContextId = new SetMap<string, CompatTab>();
    for (const tab of this._tabs) {
      const cookieStoreId = tab.cookieStore.id;
      tabsByUserContextId.addItem(cookieStoreId, tab);
    }
    const userContextMap = new Map<string, DisplayedContainer>();
    for (const userContext of this._definedDisplayedContainers) {
      userContextMap.set(userContext.cookieStore.id, userContext);
    }
    const fragment = this.getFragment();
    fragment.textContent = '';
    for (const cookieStoreId of tabsByUserContextId.keys()) {
      const tabs = [... tabsByUserContextId.get(cookieStoreId) ?? []];
      tabs.sort((a, b) => {
        if (a.windowId == b.windowId) {
          return a.index - b.index;
        }
        return a.windowId - b.windowId;
      });
      const userContext = userContextMap.get(cookieStoreId);
      if (!userContext) {
        continue;
      }
      const userContextElement = this._popupRenderer.renderContainerForFirstPartyDomain(this._domain, userContext, userContext.cookieStore.isPrivate);
      fragment.appendChild(userContextElement);
      let tabCount = 0;
      for (const tab of tabs) {
        const tabElement = this._popupRenderer.renderTab(tab, userContext);
        userContextElement.appendChild(tabElement);
        tabCount++;
      }
      userContextElement.tabCount = tabCount;
    }
  }

  public activate(domain: string): void {
    this._domain = domain;
    this.setSite();
    this.renderSite();
    this.frameLayoutElement.activateFragment(this.getFragmentId());
  }

  public override getFocusableElements(): HTMLElement[] {
    return [... this.getFragment().querySelectorAll('menulist-container, menulist-tab')] as HTMLElement[];
  }
}
