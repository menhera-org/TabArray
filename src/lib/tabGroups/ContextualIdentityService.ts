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
import { ContextualIdentityFactory, ContextualIdentityParams, CookieStore, DisplayedContainerFactory, DisplayedContainerParams } from "weeg-containers";

import { ServiceRegistry } from '../ServiceRegistry';

export class ContextualIdentityService {
  private static readonly DEFAULT_ICON_URL = browser.runtime.getURL('/img/material-icons/category.svg');
  private static readonly PRIVATE_ICON_URL = browser.runtime.getURL('/img/firefox-icons/private-browsing-icon.svg');
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

  private readonly _factory = this.createFactory();
  private readonly _displayedContainerFactory = this.createDisplayedContainerFactory();

  private constructor() {
    // nothing.
  }

  private createFactory(): ContextualIdentityFactory {
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

  private createDisplayedContainerFactory(): DisplayedContainerFactory {
    const displayedAttributesProvider = (cookieStoreId: string): DisplayedContainerParams => {
      return this.getDefaultParams(cookieStoreId);
    };
    return new DisplayedContainerFactory(displayedAttributesProvider);
  }

  private getDefaultName(cookieStoreId: string): string {
    switch (cookieStoreId) {
      case CookieStore.DEFAULT.id: {
        return browser.i18n.getMessage('noContainer');
      }

      case CookieStore.PRIVATE.id: {
        return browser.i18n.getMessage('privateBrowsing');
      }

      default: {
        const cookieStore = new CookieStore(cookieStoreId);
        return browser.i18n.getMessage('invalidContainerName', String(cookieStore.userContextId));
      }
    }
  }

  public getDefaultParams(cookieStoreId: string): DisplayedContainerParams {
    const cookieStore = new CookieStore(cookieStoreId);
    return {
      name: this.getDefaultName(cookieStore.id),
      iconUrl: cookieStore.isPrivate ? ContextualIdentityService.PRIVATE_ICON_URL : ContextualIdentityService.DEFAULT_ICON_URL,
      colorCode: ContextualIdentityService.DEFAULT_COLOR_CODE,
    };
  }

  public getFactory(): ContextualIdentityFactory {
    return this._factory;
  }

  public getDisplayedContainerFactory(): DisplayedContainerFactory {
    return this._displayedContainerFactory;
  }
}

ServiceRegistry.getInstance().registerService('ContextualIdentityService', ContextualIdentityService.getInstance());
