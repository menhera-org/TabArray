// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

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
import { OriginAttributes } from "./OriginAttributes";
import { Tab } from "../tabs";
import { FirstPartyService } from './FirstPartyService';

type TabGroupObserver = (tabGroup: TabGroup) => void;

export class TabGroup {
  public readonly originAttributes: OriginAttributes;
  private readonly _tabIds = new Set<number>();
  private readonly _firstPartyService = FirstPartyService.getInstance();
  private readonly _observers = new Set<TabGroupObserver>();

  private static _urlIsHttpOrHttps(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  public constructor(originAttributes: OriginAttributes) {
    this.originAttributes = originAttributes;
    if (!this.originAttributes.hasFirstpartyDomain() && !this._hasCookieStoreId()) {
      throw new Error('TabGroup must have either a first-party domain or a cookie store ID');
    }
    this.refreshTabs().catch((e) => {
      console.error(e);
    });
    this._watchFirstPartyDomain();
    this._watchCreatedTabs();
    this._watchRemovedTabs();
  }

  private _watchRemovedTabs(): void {
    browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
      if (this._tabIds.has(tabId)) {
        this._tabIds.delete(tabId);
        this._notifyObservers();
      }
    });
  }

  private _watchFirstPartyDomain(): void {
    if (this.originAttributes.hasFirstpartyDomain()) {
      browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.url === undefined) {
          return;
        }
        if (this._tabIds.has(tabId)) {
          if (!TabGroup._urlIsHttpOrHttps(tab.url)) {
            this._tabIds.delete(tabId);
            this._notifyObservers();
            return;
          }
          const url = new URL(tab.url);
          const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
          if (firstPartyDomain !== this.originAttributes.firstpartyDomain) {
            this._tabIds.delete(tabId);
            this._notifyObservers();
          }
        } else {
          if (!TabGroup._urlIsHttpOrHttps(tab.url)) {
            return;
          }
          const url = new URL(tab.url);
          const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
          if (firstPartyDomain === this.originAttributes.firstpartyDomain) {
            if (this._hasCookieStoreId()) {
              if (tab.cookieStoreId === this.originAttributes.cookieStoreId) {
                this._tabIds.add(tabId);
                this._notifyObservers();
              }
            } else {
              this._tabIds.add(tabId);
              this._notifyObservers();
            }
          }
        }
      }, {
        properties: ['url'],
      });
    }
  }

  private _watchCreatedTabs(): void {
    // When there is a first-party domain, tabs are added at the time of url update.
    if (this._hasCookieStoreId()) {
      browser.tabs.onCreated.addListener((tab) => {
        if (tab.cookieStoreId === this.originAttributes.cookieStoreId && tab.id !== undefined) {
          if (this.originAttributes.hasFirstpartyDomain()) {
            if (tab.url !== undefined) {
              if (!TabGroup._urlIsHttpOrHttps(tab.url)) {
                return;
              }
              const url = new URL(tab.url);
              const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
              if (firstPartyDomain === this.originAttributes.firstpartyDomain) {
                this._tabIds.add(tab.id);
                this._notifyObservers();
              }
            }
          } else {
            this._tabIds.add(tab.id);
            this._notifyObservers();
          }
        }
      });
    }
  }

  private _hasCookieStoreId(): boolean {
    return this.originAttributes.hasUserContextId() || this.originAttributes.isPrivateBrowsing();
  }

  private _getUrlPattern(): string {
    if (this.originAttributes.hasFirstpartyDomain()) {
      return `*://*.${this.originAttributes.firstpartyDomain}/*`;
    } else {
      return '<all_urls>';
    }
  }

  public get tabIds(): IterableIterator<number> {
    return this._tabIds.values();
  }

  public async refreshTabs(): Promise<void> {
    const query: browser.Tabs.QueryQueryInfoType = {};
    if (this._hasCookieStoreId()) {
      query.cookieStoreId = this.originAttributes.cookieStoreId;
    }
    if (this.originAttributes.hasFirstpartyDomain()) {
      query.url = this._getUrlPattern();
    }
    const tabs = await browser.tabs.query(query);
    this._tabIds.clear();
    for (const browserTab of tabs) {
      if (undefined === browserTab.id) {
        console.warn('Tab ID is undefined');
        continue;
      }
      this._tabIds.add(browserTab.id);
    }
  }

  public async getTabs(): Promise<Tab[]> {
    const tabs = [];
    for (const tabId of this._tabIds) {
      const tab = await Tab.get(tabId);
      if (tab !== null) {
        tabs.push(tab);
      }
    }
    return tabs;
  }

  private _notifyObservers(): void {
    for (const observer of this._observers) {
      observer(this);
    }
  }

  public observe(observer: TabGroupObserver): void {
    this._observers.add(observer);
  }

  public unobserve(observer: TabGroupObserver): void {
    this._observers.delete(observer);
  }
}
