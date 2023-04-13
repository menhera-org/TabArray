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

import { CompatTab } from "weeg-tabs";
import { OriginAttributes } from "../tabGroups";
import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";

/**
 * Thin wrapper around browser.tabs
 */
export class Tab {
  public readonly id: number;
  public readonly url: string;
  public readonly title: string;
  public readonly favIconUrl: string;
  public readonly windowId: number;
  public readonly originAttributes: OriginAttributes;
  public readonly discarded: boolean;
  public readonly hidden: boolean;
  public readonly active: boolean;
  public readonly pinned: boolean;
  public readonly index: number;
  public readonly isSharing: boolean;
  public readonly lastAccessed: number;
  public readonly muted: boolean;

  public static async get(id: number): Promise<Tab> {
    const tab = await browser.tabs.get(id);
    return new Tab(tab);
  }

  public static getDefaultCookieStoreId(isPrivate: boolean): string {
    return isPrivate ? "firefox-private" : "firefox-default";
  }

  public constructor(browserTab: browser.Tabs.Tab | CompatTab) {
    if (browserTab.id === undefined) {
      throw new Error("Tab ID is undefined");
    }
    this.id = browserTab.id;
    this.url = browserTab.url ?? "";
    this.title = browserTab.title ?? "";
    this.favIconUrl = browserTab.favIconUrl ?? "";
    this.windowId = browserTab.windowId ?? -1;
    this.index = browserTab.index;
    this.discarded = browserTab.discarded ?? false;
    this.hidden = browserTab.hidden ?? false;
    this.active = browserTab.active;
    this.pinned = browserTab.pinned;

    this.lastAccessed = browserTab.lastAccessed ?? 0;

    if (browserTab instanceof CompatTab) {
      this.muted = browserTab.muted;
      this.isSharing = browserTab.isSharing;
      const cookieStoreId = browserTab.cookieStore.id;
      this.originAttributes = OriginAttributes.fromCookieStoreId(cookieStoreId, this.url);
    } else {
      this.muted = browserTab.mutedInfo?.muted ?? false;
      if (browserTab.sharingState !== undefined) {
        this.isSharing = this.checkSharingState(browserTab.sharingState);
      } else {
        this.isSharing = false;
      }
      const cookieStoreId = browserTab.cookieStoreId ?? Tab.getDefaultCookieStoreId(browserTab.incognito);
      this.originAttributes = OriginAttributes.fromCookieStoreId(cookieStoreId, this.url);
    }
  }

  private checkSharingState(sharingState: browser.Tabs.SharingState): boolean {
    return (sharingState.screen != undefined)
      || (sharingState.microphone ?? false)
      || (sharingState.camera ?? false);
  }

  public get cookieStoreId(): string {
    return this.originAttributes.cookieStoreId;
  }

  public get userContextId(): Uint32.Uint32 {
    return this.originAttributes.userContextId ?? 0 as Uint32.Uint32;
  }

  public isPrivate(): boolean {
    return this.originAttributes.isPrivateBrowsing();
  }

  public isContainer(): boolean {
    return this.userContextId !== 0;
  }

  /**
   * Active tabs are also unhidable. You should change the active tab before hiding it.
   * @returns true if the tab cannot be hidden
   */
  public canBeHidden(): boolean {
    return !this.isSharing && !this.pinned;
  }

  public async close(): Promise<void> {
    await browser.tabs.remove(this.id);
  }

  public async focus(): Promise<Tab> {
    await browser.windows.update(this.windowId, { focused: true });
    const browserTab = await browser.tabs.update(this.id, { active: true });
    return new Tab(browserTab);
  }

  private async changePinState(pinned: boolean): Promise<Tab> {
    const browserTab = await browser.tabs.update(this.id, { pinned });
    return new Tab(browserTab);
  }

  public async pin(): Promise<Tab> {
    return this.changePinState(true);
  }

  public async unpin(): Promise<Tab> {
    return this.changePinState(false);
  }

  public async move(newIndex: number): Promise<Tab> {
    const browserTab = await browser.tabs.move(this.id, { index: newIndex }) as browser.Tabs.Tab;
    return new Tab(browserTab);
  }
}
