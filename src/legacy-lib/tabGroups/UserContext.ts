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
 * Originally represents a user context (contextual identity or container).
 * Now this is the same as DisplayedContainer.
 * Does not work with private browsing windows.
 * @deprecated
 */
export class UserContext implements DisplayedContainer {
  /**
   * Hack. Same as DEFAULT.
   */
  public static readonly PRIVATE: UserContext =  new UserContext(CookieStore.PRIVATE, browser.i18n.getMessage('privateBrowsing'), '', '/img/firefox-icons/private-browsing-icon.svg');

  // this is a hack. we should move to a better way of doing this.
  public static fromDisplayedContainer(displayedContainer: DisplayedContainer): UserContext {
    return new UserContext(displayedContainer.cookieStore, displayedContainer.name, displayedContainer.colorCode, displayedContainer.iconUrl);
  }

  public readonly cookieStore: CookieStore;

  /**
   * The user context ID for the identity.
   * @deprecated
   */
  public readonly id: Uint32;

  /**
    * Name of the identity.
    */
  public readonly name: string;

  /**
    * A hex code representing the exact color used for the identity.
    */
  public readonly colorCode: string;

  /**
    * A full resource:// URL pointing to the identity's icon.
    */
  public readonly iconUrl: string;

  /**
   * This is not intended to be called directly.
   */
  public constructor(cookieStore: CookieStore, name: string, colorCode: string, iconUrl: string) {
    this.cookieStore = cookieStore;
    this.id = cookieStore.userContextId;
    this.name = name;
    this.colorCode = colorCode;
    this.iconUrl = iconUrl;
  }
}
