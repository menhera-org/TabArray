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

import { ServiceRegistry } from "./ServiceRegistry";

export class TabIconService {
  private static readonly MASKED_ICONS = new Map([
    ['chrome://global/skin/icons/settings.svg', '/img/firefox-icons/settings.svg'],
    ['chrome://global/skin/icons/developer.svg', '/img/firefox-icons/developer.svg'],
    ['chrome://browser/skin/window.svg', '/img/firefox-icons/window.svg'],
    ['chrome://mozapps/skin/extensions/extension.svg', '/img/firefox-icons/extension.svg'],
    ['', '/img/firefox-icons/defaultFavicon.svg'],
  ]);

  private static readonly _INSTANCE = new TabIconService();

  public static getInstance(): TabIconService {
    return this._INSTANCE;
  }

  public isMaskedIcon(iconUrl: string): boolean {
    return TabIconService.MASKED_ICONS.has(iconUrl);
  }

  public getMaskedIcon(iconUrl: string): string {
    return TabIconService.MASKED_ICONS.get(iconUrl) || iconUrl;
  }
}

ServiceRegistry.getInstance().registerService('TabIconService', TabIconService.getInstance());
