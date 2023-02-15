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
import { CookieStore } from "../frameworks/tabAttributes/CookieStore";

export abstract class ContentScriptRegistrar {
  protected readonly contentScripts = new Map<string, browser.ContentScripts.RegisteredContentScript>();

  public async unregister(cookieStoreId: string): Promise<void> {
    await this.contentScripts.get(cookieStoreId)?.unregister();
    this.contentScripts.delete(cookieStoreId);
  }

  public async unregisterAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const cookieStoreId of this.contentScripts.keys()) {
      promises.push(this.unregister(cookieStoreId));
    }
    await Promise.all(promises);
  }

  public async register(cookieStoreId: string): Promise<void> {
    const cookieStore = CookieStore.fromId(cookieStoreId);
    this.unregister(cookieStoreId);
    this.contentScripts.set(cookieStoreId, await browser.contentScripts.register({
      js: [{ code: this.getContentScriptString(cookieStore) }],
      matches: ['<all_urls>'],
      runAt: 'document_start',
      allFrames: true,
      cookieStoreId,
    }));
  }

  public async registerAll(): Promise<void> {
    const cookieStores = await CookieStore.getAll();
    const cookieStoreIds = cookieStores.map(cookieStore => cookieStore.id);
    const previousCookieStoreIds = Array.from(this.contentScripts.keys());

    const unregisterPromises: Promise<void>[] = [];
    for (const cookieStoreId of previousCookieStoreIds) {
      if (!cookieStoreIds.includes(cookieStoreId)) {
        unregisterPromises.push(this.unregister(cookieStoreId));
      }
    }
    await Promise.all(unregisterPromises);

    const registerPromises: Promise<void>[] = [];
    for (const cookieStoreId of cookieStoreIds) {
      registerPromises.push(this.register(cookieStoreId));
    }
    await Promise.all(registerPromises);
  }

  public abstract getContentScriptString(cookieStore: CookieStore): string;
}
