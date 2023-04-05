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
import { Tab } from "../../frameworks/tabs";
import browser from "webextension-polyfill";
import { MenulistSiteElement } from "../../components/menulist-site";
import { HostnameService } from "weeg-domains";
import { FirstPartyService } from "../../frameworks/tabGroups";
import { EventSink } from "../../frameworks/utils";

export class SitesFragmentBuilder extends AbstractFragmentBuilder {
  public readonly onSiteClicked = new EventSink<string>();

  private _siteCount = 0;
  private readonly _hostnameService = HostnameService.getInstance();
  private readonly _firstPartyService = FirstPartyService.getInstance();

  public getFragmentId(): string {
    return 'fragment-sites';
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
    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    topBarElement.headingText = browser.i18n.getMessage('sitesN', this._siteCount.toFixed(0));
  }

  public render(firstPartyStateSnapshot: ReadonlyMap<string, ReadonlySet<Tab>>): void {
    this._siteCount = firstPartyStateSnapshot.size;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
    const fragment = this.getFragment();
    fragment.textContent = '';
    const hostnames = this._hostnameService.sortDomains([... firstPartyStateSnapshot.keys()]);
    for (const domain of hostnames) {
      const tabSet = firstPartyStateSnapshot.get(domain) ?? new Set();
      const tabs = [... tabSet];
      const lastAccessedTab = tabs.reduce((a, b) => a.lastAccessed > b.lastAccessed ? a : b);
      const siteElement = new MenulistSiteElement();
      siteElement.domain = domain || '(null)';
      siteElement.tabCount = tabs.length;
      siteElement.tabIcon = lastAccessedTab.favIconUrl;
      siteElement.tabLabel = lastAccessedTab.title;
      fragment.appendChild(siteElement);

      siteElement.onSiteClicked.addListener(() => {
        this.onSiteClicked.dispatch(domain);
      });

      siteElement.onSiteCloseClicked.addListener(() => {
        FirstPartyService.getInstance().closeTabsByFirstPartyDomain(domain).catch((e) => {
          console.error(e);
        });
      });
    }
  }

  public override getFocusableElements(): HTMLElement[] {
    return [... this.getFragment().querySelectorAll('menulist-site')] as HTMLElement[];
  }
}
