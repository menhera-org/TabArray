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

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { DisplayedContainer, CookieStore } from 'weeg-containers';

/**
 * Represents a user context (contextual identity or container).
 * Does not work with private browsing windows.
 * @deprecated
 */
export class UserContext {
  private static readonly DEFAULT_STORE = 'firefox-default';
  private static readonly PRIVATE_STORE = 'firefox-private';

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

  /**
    * Returns true if the given id is a valid user context id.
    */
  private static validateUserContextId(id: Uint32.Uint32): boolean {
    return 0 <= id;
  }

  public static createIncompleteUserContext(id: Uint32.Uint32): UserContext {
    const defined = id == UserContext.ID_DEFAULT;
    return new UserContext(id, '', '', '', '', '', defined);
  }

  /**
    * Converts a user context ID to a cookie store ID.
    */
  private static toCookieStoreId(userContextId: Uint32.Uint32): string {
    return CookieStore.fromParams({
      userContextId,
      privateBrowsingId: 0 as Uint32.Uint32,
    }).id;
  }

  // this is a hack. we should move to a better way of doing this.
  public static fromDisplayedContainer(displayedContainer: DisplayedContainer): UserContext {
    if (displayedContainer.cookieStore.isPrivate) {
      return new UserContext(displayedContainer.cookieStore.userContextId, displayedContainer.name, '', '', '', displayedContainer.iconUrl, true, true);
    }
    return new UserContext(displayedContainer.cookieStore.userContextId, displayedContainer.name, '', displayedContainer.colorCode, '', displayedContainer.iconUrl, true);
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
}
