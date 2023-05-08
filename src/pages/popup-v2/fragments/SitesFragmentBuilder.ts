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
import { EventSink } from "weeg-events";
import { HostnameService } from "weeg-domains";

import { TabQueryService } from "../../../lib/tabs/TabQueryService";
import { IndexTabService } from "../../../lib/tabs/IndexTabService";
import { CompatConsole } from "../../../lib/console/CompatConsole";
import { BrowserStateDao } from "../../../lib/states/BrowserStateDao";
import { TabDao } from "../../../lib/states/TabDao";

import { CtgFragmentElement } from "../../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../../components/ctg/ctg-top-bar";
import { MenulistSiteElement } from "../../../components/menulist-site";

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class SitesFragmentBuilder extends AbstractFragmentBuilder {
  public readonly onSiteClicked = new EventSink<string>();

  private _siteCount = 0;
  private readonly _hostnameService = HostnameService.getInstance();
  private readonly _tabQueryService = TabQueryService.getInstance();
  private readonly _indexTabService = IndexTabService.getInstance();

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

  public render(browserState: BrowserStateDao): void {
    const keys = Object.keys(browserState.tabIdsBySite);
    this._siteCount = keys.length;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
    const fragment = this.getFragment();
    fragment.textContent = '';
    const hostnames = this._hostnameService.sortDomains([... keys]);
    for (const domain of hostnames) {
      const tabIds = browserState.tabIdsBySite[domain] ?? [];
      const tabs = this._indexTabService.filterOutIndexTabs(tabIds.map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao)));
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

      siteElement.onSiteCloseClicked.addListener(async () => {
        const siteDomain = domain;
        try {
          const tabs = await this._tabQueryService.queryTabs({
            registrableDomain: siteDomain,
          });
          const tabIds = tabs.map((tab) => tab.id);
          console.info(`Closing ${tabIds.length} tabs for ${siteDomain}...`);
          browser.tabs.remove(tabIds).catch((e) => {
            console.error(e);
          });
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  public override getFocusableElements(): HTMLElement[] {
    return [... this.getFragment().querySelectorAll('menulist-site')] as HTMLElement[];
  }
}
