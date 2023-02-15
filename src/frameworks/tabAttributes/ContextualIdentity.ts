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
import { ContextualIdentityParams } from "./ContextualIdentityParams";
import { ContextualIdentityUniqueParams } from "./ContextualIdentityUniqueParams";
import { CookieStore } from "./CookieStore";
import { EventSink } from '../utils';

export class ContextualIdentity extends CookieStore implements ContextualIdentityParams {
  public static readonly onCreated = new EventSink<ContextualIdentity>();
  public static readonly onRemoved = new EventSink<ContextualIdentity>();
  public static readonly onUpdated = new EventSink<ContextualIdentity>();

  public readonly name: string;
  public readonly icon: string;
  public readonly color: string;

  public static fromWebExtensionsContetualIdentity(identity: browser.ContextualIdentities.ContextualIdentity): ContextualIdentity {
    const params: ContextualIdentityParams = {
      ... CookieStore.fromId(identity.cookieStoreId),
      name: identity.name,
      icon: identity.icon,
      color: identity.color,
    };
    return new ContextualIdentity(params);
  }

  public static async get(cookieStoreId: string): Promise<ContextualIdentity> {
    const identity = await browser.contextualIdentities.get(cookieStoreId);
    return ContextualIdentity.fromWebExtensionsContetualIdentity(identity);
  }

  /**
   * This returns all ContextualIdentities defined, but not all CookieStores,
   * for example, the default CookieStore is not returned.
   * @returns All ContextualIdentities
   */
  public static override async getAll(): Promise<ContextualIdentity[]> {
    const identities = await browser.contextualIdentities.query({});
    return identities.map(ContextualIdentity.fromWebExtensionsContetualIdentity);
  }

  public static async create(params: ContextualIdentityUniqueParams): Promise<ContextualIdentity> {
    const identity = await browser.contextualIdentities.create(params);
    return ContextualIdentity.fromWebExtensionsContetualIdentity(identity);
  }

  public static async remove(cookieStoreId: string): Promise<void> {
    await browser.contextualIdentities.remove(cookieStoreId);
  }

  public static async removeBrowsingData(cookieStoreId: string): Promise<void> {
    await browser.browsingData.remove({
      cookieStoreId: cookieStoreId,
    }, {
      cookies: true,
      localStorage: true, // not supported on old Firefox
      indexedDB: true,
    });
  }

  public constructor(params: ContextualIdentityParams) {
    super(params);
    this.name = params.name;
    this.icon = params.icon;
    this.color = params.color;
  }

  public async setParams(params: ContextualIdentityUniqueParams): Promise<ContextualIdentity> {
    //
    const updated = await browser.contextualIdentities.update(this.id, params);
    return ContextualIdentity.fromWebExtensionsContetualIdentity(updated);
  }
}

browser.contextualIdentities.onCreated.addListener((changeInfo) => {
  const created = ContextualIdentity.fromWebExtensionsContetualIdentity(changeInfo.contextualIdentity);
  ContextualIdentity.onCreated.dispatch(created);
});

browser.contextualIdentities.onRemoved.addListener((changeInfo) => {
  const removed = ContextualIdentity.fromWebExtensionsContetualIdentity(changeInfo.contextualIdentity);
  ContextualIdentity.onRemoved.dispatch(removed);
});

browser.contextualIdentities.onUpdated.addListener((changeInfo) => {
  const updated = ContextualIdentity.fromWebExtensionsContetualIdentity(changeInfo.contextualIdentity);
  ContextualIdentity.onUpdated.dispatch(updated);
});
