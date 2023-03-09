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
import { Uint32 } from '../types';
import { EventSink } from '../utils';
import { OriginAttributes } from './OriginAttributes';
import { TabGroup } from './TabGroup';
import { ContainerAttributes } from '../tabAttributes';

/**
 * Represents a user context (contextual identity or container).
 * Does not work with private browsing windows.
 * @deprecated
 */
export class UserContext {
  private static readonly DEFAULT_STORE = 'firefox-default';
  private static readonly PRIVATE_STORE = 'firefox-private';
  private static readonly CONTAINER_STORE = 'firefox-container-';

  /**
   * User context ID for "No Container" container (0).
   */
  public static readonly ID_DEFAULT = 0 as Uint32.Uint32;

  /**
    * "No Container" container.
    */
  public static readonly DEFAULT: UserContext = UserContext.createIncompleteUserContext(UserContext.ID_DEFAULT);

  /**
   * Hack. Same as DEFAULT.
   */
  public static readonly PRIVATE: UserContext =  new UserContext(UserContext.ID_DEFAULT, browser.i18n.getMessage('privateBrowsing'), '', '', '', '/img/firefox-icons/private-browsing-icon.svg', true, true);

  // event listeners.

  /**
   * Fired when the identity is created.
   */
  public static readonly onCreated = new EventSink<UserContext>();

  /**
   * Fired when the identity is removed.
   */
  public static readonly onRemoved = new EventSink<Uint32.Uint32>();

  /**
   * Fired when the identity is updated.
   */
  public static readonly onUpdated = new EventSink<UserContext>();

  /**
    * Returns true if the given id is a valid user context id.
    */
  public static validateUserContextId(id: Uint32.Uint32): boolean {
    return 0 <= id;
  }

  public static createIncompleteUserContext(id: Uint32.Uint32): UserContext {
    const defined = id == UserContext.ID_DEFAULT;
    return new UserContext(id, '', '', '', '', '', defined);
  }

  public static isCookieStoreIdPrivateBrowsing(cookieStoreId: string): boolean {
    return cookieStoreId == UserContext.PRIVATE_STORE;
  }

  /**
    * Converts a cookie store ID to a user context ID.
    */
  public static fromCookieStoreId(cookieStoreId: string): Uint32.Uint32 {
    if (cookieStoreId == UserContext.DEFAULT_STORE) {
      return 0 as Uint32.Uint32;
    } else if (UserContext.isCookieStoreIdPrivateBrowsing(cookieStoreId)) {
      throw new TypeError('Cannot convert private browsing cookie store ID to user context ID');
    }
    if (!cookieStoreId.startsWith(UserContext.CONTAINER_STORE)) {
      throw new TypeError('Invalid cookie store ID');
    }
    const userContextIdString = cookieStoreId.slice(UserContext.CONTAINER_STORE.length);
    return Uint32.fromString(userContextIdString);
  }

  /**
    * Converts a user context ID to a cookie store ID.
    */
  public static toCookieStoreId(userContextId: Uint32.Uint32): string {
    if (!UserContext.validateUserContextId(userContextId)) {
      throw new TypeError('Invalid user context ID');
    }
    if (userContextId == 0) {
      return UserContext.DEFAULT_STORE;
    }
    return UserContext.CONTAINER_STORE + userContextId;
  }

  public static fromContextualIdentity(identity: browser.ContextualIdentities.ContextualIdentity): UserContext {
    const userContextId = UserContext.fromCookieStoreId(identity.cookieStoreId);
    return new UserContext(
      userContextId,
      identity.name,
      identity.color,
      identity.colorCode,
      identity.icon,
      identity.iconUrl,
    );
  }

  public static async get(userContextId: Uint32.Uint32) {
    if (0 == userContextId) {
      return UserContext.DEFAULT;
    }
    const cookieStoreId = UserContext.toCookieStoreId(userContextId);
    try {
      const identity = await browser.contextualIdentities.get(cookieStoreId);
      if (!identity) {
        throw new Error('Identity not found');
      }
      return UserContext.fromContextualIdentity(identity);
    } catch (_e) {
      return UserContext.createIncompleteUserContext(userContextId);
    }
  }

  public static async getAll(isPrivateBrowsing = false): Promise<UserContext[]> {
    if (isPrivateBrowsing) {
      return [UserContext.DEFAULT];
    }
    const identities = await browser.contextualIdentities.query({});
    const userContexts = identities.map(identity => {
      return UserContext.fromContextualIdentity(identity);
    });
    userContexts.push(UserContext.DEFAULT);
    userContexts.sort((a, b) => a.id - b.id);
    return userContexts;
  }

  public static async getAllActiveIds(): Promise<Uint32.Uint32[]> {
    const tabs = await browser.tabs.query({});
    const userContextIds = new Set<Uint32.Uint32>();
    for (const tab of tabs) {
      if (tab.incognito) {
        continue;
      }
      userContextIds.add(UserContext.fromCookieStoreId(tab.cookieStoreId ?? UserContext.DEFAULT_STORE));
    }
    return Array.from(userContextIds);
  }

  public static async define(name: string, color: string, icon: string): Promise<UserContext> {
    const identity = await browser.contextualIdentities.create({
      name,
      color,
      icon,
    });
    const userContext = UserContext.fromContextualIdentity(identity);
    return userContext;
  }

  // this is a hack. we should move to a better way of doing this.
  public static fromContainerAttributes(attributes: ContainerAttributes): UserContext {
    if (attributes.isPrivate) {
      return new UserContext(attributes.userContextId, attributes.name, '', '', '', '/img/firefox-icons/private-browsing-icon.svg', true, true);
    }
    return new UserContext(attributes.userContextId, attributes.name, attributes.color, attributes.colorCode, attributes.icon, attributes.iconUrl, true);
  }

  /**
   * The user context ID for the identity.
   */
  public readonly id: Uint32.Uint32;

  /**
    * Name of the identity.
    */
  public readonly name: string;

  /**
    * The color for the identity.
    */
  public readonly color: string;

  /**
    * A hex code representing the exact color used for the identity.
    */
  public readonly colorCode: string;

  /**
    * The name of an icon for the identity.
    */
  public readonly icon: string;

  /**
    * A full resource:// URL pointing to the identity's icon.
    */
  public readonly iconUrl: string;

  /**
    * Whether this identity is defined and stored in the browser or not.
    */
  public readonly defined: boolean;

  /**
   * Hack to mark this as a private browsing identity.
   */
  public readonly markedAsPrivate: boolean;

  /**
   * This is not intended to be called directly.
   */
  public constructor(id: Uint32.Uint32, name: string, color: string, colorCode: string, icon: string, iconUrl: string, defined = true, markedAsPrivate = false) {
    if (!UserContext.validateUserContextId(id)) {
      throw new TypeError('Invalid user context id');
    }
    this.id = id;
    this.name = name;
    this.color = color;
    this.colorCode = colorCode;
    this.icon = icon;
    this.iconUrl = iconUrl;
    this.defined = defined;
    this.markedAsPrivate = markedAsPrivate;
  }

  /**
   * The cookie store ID for the identity.
   */
  public get cookieStoreId(): string {
    if (this.markedAsPrivate) {
      return UserContext.PRIVATE_STORE;
    }
    return UserContext.toCookieStoreId(this.id);
  }

  /**
   * Returns false for unremovable identities.
   */
  public isRemovable(): boolean {
    return 0 != this.id;
  }

  /**
   * Returns true for incomplete containers.
   */
  public isIncomplete(): boolean {
    // name may be empty in legitimate containers.
    if (this.color == '' || this.colorCode == '') return true;
    if (this.icon == '' || this.iconUrl == '') return true;
    return false;
  }

  /**
   * Removes this identity forever.
   */
  public async remove(closeTabs = true, removeBrowsingData = true): Promise<void> {
    if (!this.isRemovable()) {
      throw new TypeError('This container cannot be deleted');
    }
    if (closeTabs) {
      const tabGroup = await this.getTabGroup();
      await tabGroup.tabList.closeTabs();
    }
    if (removeBrowsingData) await this.removeBrowsingData();
    await browser.contextualIdentities.remove(this.cookieStoreId);
  }

  public async removeBrowsingData(): Promise<void> {
    await browser.browsingData.remove({
      cookieStoreId: this.cookieStoreId,
    }, {
      cookies: true,
      localStorage: true, // not supported on old Firefox
      indexedDB: true,
    });
  }

  public async updateProperties(name: string, color: string, icon: string): Promise<UserContext> {
    const identity = await browser.contextualIdentities.update(this.cookieStoreId, {
      name,
      color,
      icon,
    });
    return UserContext.fromContextualIdentity(identity);
  }

  public toOriginAttributes(): OriginAttributes {
    return OriginAttributes.fromCookieStoreId(this.cookieStoreId);
  }

  public getTabGroup(): Promise<TabGroup> {
    return TabGroup.createTabGroup(this.toOriginAttributes());
  }

  public toContainerAttributes(): ContainerAttributes {
    return new ContainerAttributes({ userContextId: this.id, privateBrowsingId: 0 as Uint32.Uint32 }, this.name, this.color, this.icon);
  }
}

// call event listeners
browser.contextualIdentities.onCreated.addListener((changeInfo) => {
  const {contextualIdentity} = changeInfo;
  const userContext = UserContext.fromContextualIdentity(contextualIdentity);
  UserContext.onCreated.dispatch(userContext);
});

browser.contextualIdentities.onRemoved.addListener((changeInfo) => {
  const {contextualIdentity} = changeInfo;
  const userContextId = UserContext.fromCookieStoreId(contextualIdentity.cookieStoreId);
  UserContext.onRemoved.dispatch(userContextId);
});

browser.contextualIdentities.onUpdated.addListener((changeInfo) => {
  const {contextualIdentity} = changeInfo;
  const userContext = UserContext.fromContextualIdentity(contextualIdentity);
  UserContext.onUpdated.dispatch(userContext);
});
