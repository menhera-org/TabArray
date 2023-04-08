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
import { ContextualIdentityFactory, ContextualIdentityParams, CookieStore, DisplayedContainerFactory, DisplayedContainerParams } from "weeg-containers";

export class ContextualIdentityService {
  private static readonly DEFAULT_ICON_URL = browser.runtime.getURL('/img/material-icons/category.svg');
  private static readonly DEFAULT_COLOR_CODE = '#7c7c7d';

  public static getInstance(): ContextualIdentityService {
    return ContextualIdentityService.INSTANCE;
  }

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

  // TODO: move to non-framework code
  public static getIconUrl(icon: string, color: string): string {
    if (color == 'toolbar') {
      const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      color = isDarkTheme ? 'toolbar-dark' : 'toolbar-light';
    }
    return browser.runtime.getURL(`/img/contextual-identities/${icon}.svg#${color}`);
  }

  public static getColorCode(color: string): string {
    return ContextualIdentityService._COLORS[color] as string;
  }

  private static readonly INSTANCE = new ContextualIdentityService();

  private constructor() {
    // nothing.
  }

  private validateName(aName: string): string {
    return String(aName).trim();
  }

  private getDefaultName(aId: number): string {
    return aId == 0 ? browser.i18n.getMessage('noContainer') : browser.i18n.getMessage('invalidContainerName', String(aId));
  }

  public getDefaultParams(cookieStoreId: string): DisplayedContainerParams {
    const cookieStore = new CookieStore(cookieStoreId);
    return {
      name: this.getDefaultName(cookieStore.userContextId),
      iconUrl: ContextualIdentityService.DEFAULT_ICON_URL,
      colorCode: ContextualIdentityService.DEFAULT_COLOR_CODE,
    };
  }

  public getFactory(): ContextualIdentityFactory {
    const themeCallback = (params: ContextualIdentityParams): DisplayedContainerParams => {
      const color = params.color;
      const icon = params.icon;
      return {
        name: params.name,
        colorCode: ContextualIdentityService.getColorCode(color),
        iconUrl: ContextualIdentityService.getIconUrl(icon, color)
      };
    };
    return new ContextualIdentityFactory(themeCallback);
  }

  public getDisplayedContainerFactory(): DisplayedContainerFactory {
    const displayedAttributesProvider = (cookieStoreId: string): DisplayedContainerParams => {
      return this.getDefaultParams(cookieStoreId);
    };
    return new DisplayedContainerFactory(displayedAttributesProvider);
  }
}