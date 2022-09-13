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

import browser from 'webextension-polyfill';
import { OriginAttributes } from "./OriginAttributes";
import { Tab } from "../tabs";
import { FirstPartyService } from './FirstPartyService';
import { PromiseUtils } from '../utils';
import { UrlService } from '../dns';
import { TabList } from './TabList';
import { WindowService } from '../tabs';

type TabGroupObserver = (tabGroup: TabGroup) => void;

export class TabGroup {
  public readonly originAttributes: OriginAttributes;
  private readonly _tabIds = new Set<number>();
  private readonly _firstPartyService = FirstPartyService.getInstance();
  private readonly _windowService = WindowService.getInstance();
  private readonly _observers = new Set<TabGroupObserver>();
  private readonly _initializationPromise = PromiseUtils.createPromise<void>();
  private readonly _urlService = UrlService.getInstance();

  public static async createTabGroup(originAttributes: OriginAttributes): Promise<TabGroup> {
    const tabGroup = new TabGroup(originAttributes);
    await tabGroup.initialized;
    return tabGroup;
  }

  private constructor(originAttributes: OriginAttributes) {
    this.originAttributes = originAttributes;
    if (!this.originAttributes.hasFirstpartyDomain() && !this.originAttributes.hasCookieStoreId()) {
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
    browser.tabs.onRemoved.addListener((tabId, /*removeInfo*/) => {
      if (this._tabIds.has(tabId)) {
        this._tabIds.delete(tabId);
        this._notifyObservers();
      }
    });
  }

  private _watchFirstPartyDomain(): void {
    if (!this.originAttributes.hasFirstpartyDomain()) {
      return;
    }

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.url === undefined) {
        return;
      }
      const url = new URL(tab.url);
      const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
      if (this._tabIds.has(tabId)) {
        if (!this._urlService.isHttpScheme(url) || firstPartyDomain !== this.originAttributes.firstpartyDomain) {
          this._tabIds.delete(tabId);
          this._notifyObservers();
          return;
        }
      } else {
        if (!this._urlService.isHttpScheme(url) || firstPartyDomain !== this.originAttributes.firstpartyDomain) {
          return;
        }
        if (!this.originAttributes.hasCookieStoreId() || tab.cookieStoreId === this.originAttributes.cookieStoreId) {
          this._tabIds.add(tabId);
          this._notifyObservers();
        }
      }
    }, {
      properties: ['url'],
    });
  }

  private _watchCreatedTabs(): void {
    if (!this.originAttributes.hasCookieStoreId()) {
      return;
    }

    // When there is a first-party domain, tabs are added at the time of url update.
    browser.tabs.onCreated.addListener((tab) => {
      if (tab.cookieStoreId === this.originAttributes.cookieStoreId && tab.id !== undefined) {
        if (this.originAttributes.hasFirstpartyDomain()) {
          if (tab.url == undefined || !this._urlService.isHttpScheme(new URL(tab.url))) {
            return;
          }
          const url = new URL(tab.url);
          const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
          if (firstPartyDomain === this.originAttributes.firstpartyDomain) {
            this._tabIds.add(tab.id);
            this._notifyObservers();
          }
        } else {
          this._tabIds.add(tab.id);
          this._notifyObservers();
        }
      }
    });
  }

  /**
   * Returns a snapshot of tab list.
   */
  public get tabList(): TabList {
    return new TabList(this._tabIds);
  }

  public get initialized(): Promise<void> {
    return this._initializationPromise.promise;
  }

  public async refreshTabs(): Promise<void> {
    const query: browser.Tabs.QueryQueryInfoType = {};
    if (this.originAttributes.hasCookieStoreId()) {
      query.cookieStoreId = this.originAttributes.cookieStoreId;
    }
    if (this.originAttributes.hasFirstpartyDomain()) {
      query.url = this.originAttributes.getUrlPattern();
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
    this._initializationPromise.resolve();
    this._notifyObservers();
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

  public isUrlValidInGroup(url: URL): boolean {
    if (!this.originAttributes.hasFirstpartyDomain()) {
      return true;
    }
    if (!this._urlService.isHttpScheme(url)) {
      return false;
    }
    const firstPartyDomain = this._firstPartyService.getRegistrableDomain(url);
    return firstPartyDomain === this.originAttributes.firstpartyDomain;
  }

  public async openTabOnWindow(windowId: number | undefined, url: URL | null = null, active = true): Promise<Tab> {
    if (url) {
      if (this.isUrlValidInGroup(url)) {
        throw new Error('URL is not in the same first-party domain');
      }
    } else if (this.originAttributes.hasFirstpartyDomain()) {
      throw new Error('URL is not specified');
    }
    if (windowId != undefined) {
      const windowIsPrivate = await this._windowService.isPrivateWindow(windowId);
      if (this.originAttributes.isPrivateBrowsing() !== windowIsPrivate) {
        throw new Error('Window is not in the same private browsing mode');
      }
    }
    const cookieStoreId = this.originAttributes.hasCookieStoreId() ? this.originAttributes.cookieStoreId : undefined;
    const lastIndex = windowId ? await this.tabList.getLastIndexOnWindow(windowId) : undefined;
    const index = lastIndex === undefined ? undefined : lastIndex + 1;
    const urlString = url ? url.toString() : undefined;
    const browserTab = await browser.tabs.create({
      windowId,
      url: urlString,
      cookieStoreId,
      index,
      active,
    });
    const tab = new Tab(browserTab);
    return tab;
  }

  public async reopenTabInGroup(tabId: number, active = true): Promise<Tab> {
    const tab = await Tab.get(tabId);
    if (this.tabList.hasTabId(tabId)) {
      return tab;
    }
    let url: URL | null = new URL(tab.url);
    if (this._urlService.isPrivilegedScheme(url)) {
      url = null;
    }
    let windowId: number | undefined = tab.windowId;
    if (tab.isPrivate() != this.originAttributes.isPrivateBrowsing()) {
      windowId = undefined;
    }
    const newTab = await this.openTabOnWindow(windowId, url, active);
    await tab.close();
    return newTab;
  }
}
