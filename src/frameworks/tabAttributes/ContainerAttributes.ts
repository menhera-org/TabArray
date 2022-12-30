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
import { ContextualIdentity } from "./ContextualIdentity";
import { CookieStoreParams } from "./CookieStoreParams";
import { CookieStore } from './CookieStore';

export class ContainerAttributes extends ContextualIdentity {
  // TODO: allow theming, or consider syncing with Firefox's theme
  private static readonly _COLORS: { [color: string]: string } = {
    "blue": "#37adff",
    "green": "#51cd00",
    "pink": "#ff4bda",
    "turquoise": "#00c79a",
    "yellow": "#ffcb00",
    "red": "#ff613d",
    "toolbar": "#7c7c7d",
    "orange": "#ff9f00",
    "purple": "#af51f5"
  };

  public static fromContextualIdentity(identity: ContextualIdentity): ContainerAttributes {
    return new ContainerAttributes(identity, identity.name, identity.color, identity.icon);
  }

  public static fromCookieStore(cookieStore: CookieStore): ContainerAttributes {
    let name = '';
    if (cookieStore.isPrivate) {
      name = browser.i18n.getMessage('privateBrowsing');
    } else if (cookieStore.userContextId == 0) {
      name = browser.i18n.getMessage('noContainer');
    } else {
      name = browser.i18n.getMessage('invalidContainerName', cookieStore.userContextId.toFixed(0));
    }
    return new ContainerAttributes(cookieStore, name);
  }

  // TODO: move to non-framework code
  public static getIconUrl(icon: string, color: string): string {
    if (color == 'toolbar') {
      const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      color = isDarkTheme ? 'toolbar-dark' : 'toolbar-light';
    }
    return browser.runtime.getURL(`/img/contextual-identities/${icon}.svg#${color}`);
  }

  public readonly iconUrl: string;
  public readonly colorCode: string;

  public constructor(cookieStoreParams: CookieStoreParams, name?: string, color?: string, icon?: string) {
    const params = {
      ... cookieStoreParams,
      name: name || '',
      color: color || '',
      icon: icon || ''
    };
    super(params);

    if (color && icon) {
      this.iconUrl = ContainerAttributes.getIconUrl(icon, color);
    } else {
      this.iconUrl = '';
    }

    if (color) {
      this.colorCode = ContainerAttributes._COLORS[color] ?? '';
    } else {
      this.colorCode = '';
    }
  }
}
