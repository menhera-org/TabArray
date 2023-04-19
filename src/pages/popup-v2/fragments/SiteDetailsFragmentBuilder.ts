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
import { Uint32, SetMap } from "weeg-types";
import { CompatTab } from "weeg-tabs";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { PopupRendererService } from "../PopupRendererService";
import { BrowserStateSnapshot } from "../../../legacy-lib/tabs/BrowserStateSnapshot";
import { UserContext } from "../../../legacy-lib/tabGroups";

export class SiteDetailsFragmentBuilder extends AbstractFragmentBuilder {
  protected static override readonly suppressBottomNavigation = true;

  private readonly _popupRenderer = PopupRendererService.getInstance().popupRenderer;
  private _domain = '(none)';
  private _tabCount = 0;
  private _firstPartyStateSnapshot: ReadonlyMap<string, ReadonlySet<CompatTab>> | null = null;
  private _browserStateSnapshot: BrowserStateSnapshot | null = null;
  private _isPrivate = false;
  private _definedUserContexts: UserContext[] = [];
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

  public render(browserStateSnapshot: BrowserStateSnapshot, isPrivate: boolean): void {
    this._browserStateSnapshot = browserStateSnapshot;
    const firstPartyStateSnapshot = browserStateSnapshot.getFirstPartyStateSnapshot(isPrivate);
    this._firstPartyStateSnapshot = firstPartyStateSnapshot;
    this._isPrivate = isPrivate;
    this.setSite();
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }

    this.renderSite();
  }

  private setSite(): void {
    if (this._firstPartyStateSnapshot == null || this._browserStateSnapshot == null) {
      return;
    }
    const tabGroupDirectorySnapshot = this._browserStateSnapshot.getTabGroupDirectorySnapshot();
    const tabs = this._firstPartyStateSnapshot.get(this._domain) ?? new Set();
    this._tabCount = tabs.size;
    this._tabs = [... tabs];
    if (this._isPrivate) {
      this._definedUserContexts = [UserContext.PRIVATE];
    } else {
      this._definedUserContexts = [... this._browserStateSnapshot.getDefinedUserContexts()].sort((a, b) => {
        return tabGroupDirectorySnapshot.cookieStoreIdSortingCallback(a.cookieStoreId, b.cookieStoreId);
      });
    }
  }

  public renderSite(): void {
    if (this._firstPartyStateSnapshot == null) {
      return;
    }
    const tabsByUserContextId = new SetMap<Uint32.Uint32, CompatTab>();
    for (const tab of this._tabs) {
      const userContextId = tab.cookieStore.userContextId;
      tabsByUserContextId.addItem(userContextId, tab);
    }
    const userContextMap = new Map<Uint32.Uint32, UserContext>();
    for (const userContext of this._definedUserContexts) {
      userContextMap.set(userContext.id, userContext);
    }
    const fragment = this.getFragment();
    fragment.textContent = '';
    for (const userContextId of tabsByUserContextId.keys()) {
      const tabs = [... tabsByUserContextId.get(userContextId) ?? []];
      tabs.sort((a, b) => {
        if (a.windowId == b.windowId) {
          return a.index - b.index;
        }
        return a.windowId - b.windowId;
      });
      const userContext = userContextMap.get(userContextId);
      if (!userContext) {
        continue;
      }
      const userContextElement = this._popupRenderer.renderContainerForFirstPartyDomain(this._domain, userContext, this._isPrivate);
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
