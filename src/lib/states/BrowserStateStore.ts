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
import { Asserts } from "weeg-utils";
import { ContextualIdentity } from "weeg-containers";
import { RegistrableDomainService } from "weeg-domains";

import { BrowserStateDao } from "./BrowserStateDao";
import { BrowserStateService, BrowserStateConstructParams } from "./BrowserStateService";
import { TabGroupDirectory } from "../tabGroups/TabGroupDirectory";
import { ContextualIdentityService } from "../tabGroups/ContextualIdentityService";
import { TagService } from "../tabGroups/tags/TagService";
import { TabGroupAttributes } from "../tabGroups/TabGroupAttributes";
import { TabGroupDirectorySnapshot } from "../tabGroups/TabGroupDirectorySnapshot";
import { CompatConsole } from "../console/CompatConsole";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const browserStateService = BrowserStateService.getInstance();
const tabGroupDirectory = new TabGroupDirectory();
const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const tagService = TagService.getInstance();
const tagDirectory = tagService.tagDirectory;
const registrableDomainService = RegistrableDomainService.getInstance<RegistrableDomainService>();

export class BrowserStateStore {
  public static readonly FORCE_UPDATE_INTERVAL = 1000 * 60 * 5;
  public readonly onChanged = new EventSink<void>();

  private _params: BrowserStateConstructParams | null = null;
  private _value: BrowserStateDao;

  public constructor() {
    Asserts.assertNotBackgroundScript();
    this._value = {
      currentWindowId: browser.windows.WINDOW_ID_NONE,
      enabledInPrivateBrowsing: false,
      windowIds: [],
      displayedContainers: [],
      tags: {},
      tagIdsForTabs: {},
      supergroups: {},
      tabIdsByContainer: {},
      tabIdsBySite: {},
      tabs: {},
      windows: {},
    };
    this.forceUpdate();
    setInterval(() => {
      this.forceUpdate();
    }, BrowserStateStore.FORCE_UPDATE_INTERVAL);
    this.registerEventListeners();
  }

  private forceUpdate(): void {
    browserStateService.getConstructParams().then((params) => {
      this._params = params;
      this.update();
    });
  }

  private registerEventListeners(): void {
    browser.tabs.onCreated.addListener(this.addBrowserTab.bind(this));
    browser.tabs.onRemoved.addListener(this.removeTabId.bind(this));
    browser.tabs.onUpdated.addListener(this.updateBrowserTab.bind(this));
    browser.tabs.onMoved.addListener(this.moveBrowserTab.bind(this));
    browser.tabs.onAttached.addListener(this.attachBrowserTab.bind(this));
    browser.tabs.onActivated.addListener(this.activateBrowserTab.bind(this));
    browser.windows.onCreated.addListener(this.createBrowserWindow.bind(this));
    browser.windows.onRemoved.addListener(this.removeWindowId.bind(this));
    tabGroupDirectory.onChanged.addListener(this.updateTabGroupDirectorySnapshot.bind(this));
    contextualIdentityFactory.onCreated.addListener(this.createContextualIdentity.bind(this));
    contextualIdentityFactory.onUpdated.addListener(this.updateContextualIdentity.bind(this));
    contextualIdentityFactory.onRemoved.addListener(this.removeContextualIdentity.bind(this));
    tagDirectory.onChanged.addListener(this.updateTagDirectorySnapshot.bind(this));
    tagService.onChanged.addListener(() => {
      if (null == this._params) return;
      this._params.tabAttributeMap.update().then(() => {
        this.update();
      }).catch((e) => {
        console.error(e);
      });
    });
  }

  private update(): void {
    if (null == this._params) return;
    this._value = browserStateService.getBrowserState(this._params);
    this.onChanged.dispatch();
  }

  public removeTabId(tabId: number): void {
    if (null == this._params) return;
    for (const browserWindow of this._params.browserWindows) {
      if (null == browserWindow.tabs) continue;
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const browserTab = browserWindow.tabs[i] as browser.Tabs.Tab;
        if (browserTab.id === tabId) {
          browserWindow.tabs.splice(i, 1);
          break;
        }
      }
    }
    this._params.tabAttributeMap.removeTabId(tabId);
    this.update();
  }

  public addBrowserTab(browserTab: browser.Tabs.Tab): void {
    if (null == this._params) return;
    if (null == browserTab.id || null == browserTab.windowId) return;
    const windowId = browserTab.windowId;
    let windowFound = false;
    for (const browserWindow of this._params.browserWindows) {
      if (browserWindow.id !== windowId || browserWindow.tabs == null) continue;
      windowFound = true;
      browserWindow.tabs.push(browserTab);
      browserWindow.tabs.sort((a, b) => {
        if (a.windowId != b.windowId) {
          return (a.windowId ?? 0) - (b.windowId ?? 0);
        }
        return a.index - b.index;
      });
    }
    if (!windowFound) {
      const browserWindow: browser.Windows.Window = {
        id: windowId,
        alwaysOnTop: false,
        focused: false,
        incognito: browserTab.incognito,
        tabs: [browserTab],
      };
      this._params.browserWindows.push(browserWindow);
    }
    this._params.tabAttributeMap.addTabId(browserTab.id).then(() => {
      this.update();
    }).catch((e) => {
      console.error(e);
    });
  }

  public async updateBrowserTab(tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType, browserTab: browser.Tabs.Tab): Promise<void> {
    if (null == this._params) return;
    if (null == browserTab.id || null == browserTab.windowId) return;
    const windowId = browserTab.windowId;
    for (const browserWindow of this._params.browserWindows) {
      if (browserWindow.id !== windowId || browserWindow.tabs == null) continue;
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
        if (tab.id !== tabId) continue;
        Object.assign(tab, browserTab);
        break;
      }
    }
    if (changeInfo.url != null) {
      if (!this._params.registrableDomainMap.has(changeInfo.url)) {
        const registrableDomain = await registrableDomainService.getRegistrableDomain(changeInfo.url);
        this._params.registrableDomainMap.set(changeInfo.url, registrableDomain);
      }
    }
    this.update();
  }

  public activateBrowserTab(activeInfo: browser.Tabs.OnActivatedActiveInfoType): void {
    if (null == this._params) return;
    if (null == activeInfo.tabId || null == activeInfo.windowId) return;
    const windowId = activeInfo.windowId;
    for (const browserWindow of this._params.browserWindows) {
      if (browserWindow.id !== windowId || browserWindow.tabs == null) continue;
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
        if (activeInfo.previousTabId != null && tab.id === activeInfo.previousTabId || tab.id !== activeInfo.tabId) {
          tab.active = false;
          continue;
        }
        tab.active = true;
      }
      break;
    }
    this.update();
  }

  public moveBrowserTab(tabId: number, moveInfo: browser.Tabs.OnMovedMoveInfoType): void {
    if (null == this._params) return;
    if (null == moveInfo.windowId) return;
    const windowId = moveInfo.windowId;
    for (const browserWindow of this._params.browserWindows) {
      if (browserWindow.id !== windowId || browserWindow.tabs == null) continue;
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
        if (tab.id !== tabId) continue;
        browserWindow.tabs.splice(i, 1);
        browserWindow.tabs.splice(moveInfo.toIndex, 0, tab);
        break;
      }
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
        tab.index = i;
      }
    }
    this.update();
  }

  public async attachBrowserTab(tabId: number, attachInfo: browser.Tabs.OnAttachedAttachInfoType): Promise<void> {
    if (null == this._params) return;
    if (null == attachInfo.newWindowId) return;
    const newWindowId = attachInfo.newWindowId;
    let movedTab: browser.Tabs.Tab | null = null;
    let moveNecessary = true;
    for (const browserWindow of this._params.browserWindows) {
      if (browserWindow.tabs == null) continue;
      for (let i = 0; i < browserWindow.tabs.length; ++i) {
        const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
        if (tab.id !== tabId) continue;
        tab.windowId = newWindowId;
        tab.index = attachInfo.newPosition;
        if (browserWindow.id !== newWindowId) {
          browserWindow.tabs.splice(i, 1);
          movedTab = tab;
        } else {
          moveNecessary = false;
        }
        break;
      }
      if (browserWindow.id !== newWindowId) {
        for (let i = 0; i < browserWindow.tabs.length; ++i) {
          const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
          tab.index = i;
        }
      }
    }
    if (null == movedTab) {
      movedTab = await browser.tabs.get(tabId);
    }
    if (moveNecessary) {
      for (const browserWindow of this._params.browserWindows) {
        if (browserWindow.tabs == null || browserWindow.id != newWindowId) continue;
        browserWindow.tabs.splice(attachInfo.newPosition, 0, movedTab);
        for (let i = 0; i < browserWindow.tabs.length; ++i) {
          const tab = browserWindow.tabs[i] as browser.Tabs.Tab;
          tab.index = i;
        }
      }
    }
    this.update();
  }

  public async createBrowserWindow(browserWindow: browser.Windows.Window): Promise<void> {
    if (null == this._params) return;
    if (browserWindow.id == null) return;
    if (browserWindow.tabs == null) {
      console.info('browserWindow.tabs is null. fetching asynchronously...');
      browserWindow.tabs = await browser.tabs.query({ windowId: browserWindow.id });
    }
    this._params.browserWindows = this._params.browserWindows.filter((window) => window.id !== browserWindow.id);
    this._params.browserWindows.push(browserWindow);
    this.update();
  }

  public removeWindowId(windowId: number): void {
    if (null == this._params) return;
    for (let i = 0; i < this._params.browserWindows.length; ++i) {
      const browserWindow = this._params.browserWindows[i] as browser.Windows.Window;
      if (browserWindow.id !== windowId) continue;
      this._params.browserWindows.splice(i, 1);
      break;
    }
    this.update();
  }

  public updateTabGroupDirectorySnapshot(): void {
    tabGroupDirectory.getSnapshot().then((snapshot) => {
      if (null == this._params) return;
      this._params.tabGroupDirectorySnapshot = snapshot;
      this.update();
    });
  }

  public updateTagDirectorySnapshot(): void {
    tagDirectory.getSnapshot().then((snapshot) => {
      if (null == this._params) return;
      this._params.tabAttributeMap.setTagDirectorySnapshot(snapshot);
      this.update();
    });
  }

  public createContextualIdentity(identity: ContextualIdentity): void {
    if (null == this._params) return;
    this._params.displayedContainers.push(identity);
    const rootSupergroupTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId();
    const supergroups = this._params.tabGroupDirectorySnapshot.value;
    const rootSupergroup = supergroups[rootSupergroupTabGroupId];
    if (rootSupergroup) {
      rootSupergroup.members.push(identity.cookieStore.id);
      this._params.tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(supergroups);
    }
    this.update();
  }

  public updateContextualIdentity(identity: ContextualIdentity): void {
    if (null == this._params) return;
    for (let i = 0; i < this._params.displayedContainers.length; ++i) {
      const displayedContainer = this._params.displayedContainers[i] as ContextualIdentity;
      if (displayedContainer.cookieStore.id !== identity.cookieStore.id) continue;
      this._params.displayedContainers[i] = identity;
      break;
    }
    this.update();
  }

  public removeContextualIdentity(identity: ContextualIdentity): void {
    if (null == this._params) return;
    for (let i = 0; i < this._params.displayedContainers.length; ++i) {
      const displayedContainer = this._params.displayedContainers[i] as ContextualIdentity;
      if (displayedContainer.cookieStore.id !== identity.cookieStore.id) continue;
      this._params.displayedContainers.splice(i, 1);
      break;
    }
    const supergroups = this._params.tabGroupDirectorySnapshot.value;
    for (const supergroupTabGroupId in supergroups) {
      const supergroup = supergroups[supergroupTabGroupId];
      if (!supergroup) continue;
      supergroup.members = supergroup.members.filter((member) => {
        return member !== identity.cookieStore.id;
      });
    }
    this._params.tabGroupDirectorySnapshot = new TabGroupDirectorySnapshot(supergroups);
    this.update();
  }

  public get value(): BrowserStateDao {
    return structuredClone(this._value);
  }
}
