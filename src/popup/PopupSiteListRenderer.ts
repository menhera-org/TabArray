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

import { MenulistSiteButtonElement } from '../components/menulist-site-button';
import { Tab } from '../frameworks/tabs';
import { PopupRenderer } from './PopupRenderer';
import { FirstPartyService, FirstPartyTabMap, FirstPartyUserContextList } from '../frameworks/tabGroups';

export class PopupSiteListRenderer {
  private readonly _popupRenderer: PopupRenderer;
  private _renderedSiteDetails: { domain: string, isPrivate: boolean } | null = null;

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

    const iconUrl = tabs[0] ? tabs[0].favIconUrl : '/img/transparent.png';
    siteButton.tabIcon = iconUrl;
    siteButton.tabLabel = tabs[0] ? tabs[0].title : '';
    siteButton.addEventListener('click', () => {
      // render site details.
      this.updateSiteDetailsView(siteDomain, isPrivateBrowsing).then(() => {
        this.switchToSiteDetailsView();
      });
    });
    return siteButton;
  }

  public renderSiteListView(tabMap: FirstPartyTabMap, element: HTMLElement): void {
    element.textContent = '';
    for (const [domain, tabs] of tabMap) {
      const siteButton = this.renderSiteSummary(domain, tabs);
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
    domainElement.textContent = firstPartyDomain;
    siteMenuListElement.textContent = '';
    this._renderedSiteDetails = { domain: firstPartyDomain, isPrivate: firstPartyUserContextList.isPrivate };
    for (const userContext of firstPartyUserContextList.getOpenUserContexts()) {
      const userContextElement = this._popupRenderer.renderContainerForFirstPartyDomain(firstPartyDomain, userContext, firstPartyUserContextList.isPrivate);
      siteMenuListElement.appendChild(userContextElement);
      for (const tab of firstPartyUserContextList.getUserContextTabs(userContext.id)) {
        const tabElement = this._popupRenderer.renderTab(tab, userContext);
        userContextElement.appendChild(tabElement);
      }
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
