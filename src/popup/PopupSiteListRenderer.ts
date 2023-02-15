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
import { MenulistSiteButtonElement } from '../components/menulist-site-button';
import { Tab } from '../frameworks/tabs';
import { PopupRenderer } from './PopupRenderer';
import { FirstPartyService, FirstPartyUserContextList } from '../frameworks/tabGroups';
import { BrowserStateSnapshot } from '../frameworks/tabs/BrowserStateSnapshot';
import { HostnameService } from '../frameworks/dns';
import { TabIconService } from '../modules/TabIconService';

export class PopupSiteListRenderer {
  private readonly _popupRenderer: PopupRenderer;
  private _renderedSiteDetails: { domain: string, isPrivate: boolean } | null = null;
  private readonly _tabIconService = TabIconService.getInstance();

  public constructor(popupRenderer: PopupRenderer) {
    this._popupRenderer = popupRenderer;
  }

  public renderSiteSummary(siteDomain: string, tabs: ReadonlyArray<Tab>, isPrivateBrowsing = false): MenulistSiteButtonElement {
    const siteButton = new MenulistSiteButtonElement();
    siteButton.tabCountString = String(tabs.length);
    siteButton.siteDomain = siteDomain || '(null)';
    siteButton.onCloseClicked.addListener(() => {
      FirstPartyService.getInstance().closeTabsByFirstPartyDomain(siteDomain).catch((e) => {
        console.error(e);
      });
    });

    const lastAccessedTab = tabs.reduce((a, b) => a.lastAccessed > b.lastAccessed ? a : b);
    const iconUrl = lastAccessedTab.favIconUrl ?? '';
    if (this._tabIconService.isMaskedIcon(iconUrl)) {
      siteButton.iconIsMasked = true;
      siteButton.tabIcon = this._tabIconService.getMaskedIcon(iconUrl);
    } else {
      siteButton.iconIsMasked = false;
      siteButton.tabIcon = iconUrl;
    }
    siteButton.tabLabel = lastAccessedTab.title ?? '';
    siteButton.addEventListener('click', () => {
      // render site details.
      this.updateSiteDetailsView(siteDomain || '.', isPrivateBrowsing).then(() => {
        this.switchToSiteDetailsView();
      });
    });
    return siteButton;
  }

  public renderSiteListView(browserStateSnapshot: BrowserStateSnapshot, element: HTMLElement, topboxElement: HTMLElement): void {
    const currentWindowId = browserStateSnapshot.currentWindowId;
    const currentWindowState = browserStateSnapshot.getWindowStateSnapshot(currentWindowId);
    const isPrivate = currentWindowState.isPrivate;
    const firstPartyState = browserStateSnapshot.getFirstPartyStateSnapshot(isPrivate);
    element.textContent = '';
    const sitesCount = firstPartyState.size;
    topboxElement.textContent = browser.i18n.getMessage('sitesN', sitesCount.toFixed(0));
    const firstPartyTabs: { domain: string, tabs: Tab[] }[] = [];
    for (const [domain, tabs] of firstPartyState) {
      firstPartyTabs.push({ domain, tabs: [... tabs] });
    }
    firstPartyTabs.sort((a, b) => HostnameService.getInstance().compareDomains(a.domain, b.domain));
    for (const {domain, tabs} of firstPartyTabs) {
      const siteButton = this.renderSiteSummary(domain, tabs, isPrivate);
      element.appendChild(siteButton);
    }
  }

  public renderSiteDetailsView(firstPartyUserContextList: FirstPartyUserContextList, element: HTMLElement): void {
    // tempering with elements this way is not ideal, but it's the easiest way to
    // get the desired result.
    const domainElement = element.querySelector<HTMLDivElement>('#site-pane-details-domain');
    const siteMenuListElement = element.querySelector<HTMLDivElement>('#siteMenuList');
    if (!domainElement || !siteMenuListElement) {
      return;
    }
    const firstPartyDomain = firstPartyUserContextList.firstPartyDomain;
    domainElement.textContent = firstPartyDomain == '.' ? '(null)' : firstPartyDomain;
    siteMenuListElement.textContent = '';
    this._renderedSiteDetails = { domain: firstPartyDomain, isPrivate: firstPartyUserContextList.isPrivate };
    let tabCount = 0;
    for (const userContext of firstPartyUserContextList.getOpenUserContexts()) {
      const userContextElement = this._popupRenderer.renderContainerForFirstPartyDomain(firstPartyDomain, userContext, firstPartyUserContextList.isPrivate);
      siteMenuListElement.appendChild(userContextElement);
      for (const tab of firstPartyUserContextList.getUserContextTabs(userContext.id)) {
        const tabElement = this._popupRenderer.renderTab(tab, userContext);
        userContextElement.appendChild(tabElement);
        tabCount++;
      }
      userContextElement.tabCount = tabCount;
    }
  }

  public async updateSiteDetailsView(firstPartyDomain: string, isPrivateBrowsing: boolean): Promise<void> {
    const firstPartyUserContextList = await FirstPartyUserContextList.create(firstPartyDomain, isPrivateBrowsing);
    const element = document.querySelector<HTMLDivElement>('#sites-pane-details');
    if (!element) {
      return;
    }
    this.renderSiteDetailsView(firstPartyUserContextList, element);
  }

  public async rerenderSiteDetailsView(): Promise<void> {
    if (!this._renderedSiteDetails) {
      return;
    }
    await this.updateSiteDetailsView(this._renderedSiteDetails.domain, this._renderedSiteDetails.isPrivate);
  }

  public switchToSiteDetailsView(): void {
    // TODO: move this code elsewhere.
    const sitesElement = document.querySelector<HTMLDivElement>('#sites');
    if (!sitesElement) {
      return;
    }
    sitesElement.dataset.activeContent = 'sites-details';
  }

  public switchToSiteListView(): void {
    // TODO: move this code elsewhere.
    const sitesElement = document.querySelector<HTMLDivElement>('#sites');
    if (!sitesElement) {
      return;
    }
    sitesElement.dataset.activeContent = 'sites';
  }
}
