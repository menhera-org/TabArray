// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

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
import { UserContext } from "../frameworks/tabGroups";

export class UserContextService {
  private static readonly DEFAULT_ICON_URL = browser.runtime.getURL('/img/category_black_24dp.svg');
  private static readonly DEFAULT_COLOR_CODE = '#7c7c7d';

  /**
   * Valid colors for containers.
   */
  private static readonly COLORS: ReadonlyArray<string> = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
    "toolbar",
  ];

  private static readonly ICONS: ReadonlyArray<string> = [
    "fingerprint",
    "briefcase",
    "dollar",
    "cart",
    "circle",
    "gift",
    "vacation",
    "food",
    "fruit",
    "pet",
    "tree",
    "chill",
    "fence",
  ];

  private static readonly INSTANCE = new UserContextService();

  public static getInstance(): UserContextService {
    return UserContextService.INSTANCE;
  }

  private constructor() {
    // nothing to do.
  }

  private validateValue(aValue: string, aOptions: ReadonlyArray<string>): string {
    let value = String(aValue).toLowerCase();
    if (!aOptions[0]) {
      throw new Error('Default value is not defined'); // this should not happen
    }
    if (!aOptions.includes(value)) {
      value = aOptions[0];
    }
    return value;
  }

  private validateColor(aColor: string): string {
    return this.validateValue(aColor, UserContextService.COLORS);
  }

  private validateIcon(aIcon: string): string {
    return this.validateValue(aIcon, UserContextService.ICONS);
  }

  private validateName(aName: string): string {
    return String(aName).trim();
  }

  private getDefaultName(aId: number): string {
    return aId == 0 ? browser.i18n.getMessage('noContainer') : browser.i18n.getMessage('invalidContainerName', String(aId));
  }

  public fillDefaultValues(userContext: UserContext): UserContext {
    const attrs = {... userContext};
    if (attrs.name === '') {
      attrs.name = this.getDefaultName(attrs.id);
    }
    if (attrs.iconUrl === '') {
      attrs.iconUrl = UserContextService.DEFAULT_ICON_URL;
    }
    if (attrs.colorCode === '') {
      attrs.colorCode = UserContextService.DEFAULT_COLOR_CODE;
    }
    if (attrs.icon === '') {
      attrs.icon = 'circle';
    }
    if (attrs.color === '') {
      attrs.color = 'toolbar';
    }
    return new UserContext(attrs.id, attrs.name, attrs.color, attrs.colorCode, attrs.icon, attrs.iconUrl, attrs.defined);
  }

  public async create(aName: string, aColor: string, aIcon: string): Promise<UserContext> {
    const color = this.validateColor(aColor);
    const icon = this.validateIcon(aIcon);
    let name = this.validateName(aName);
    const isUnnamed = '' === name;
    if (isUnnamed) {
      name = '_unnamed_container_';
    }
    let userContext = await UserContext.define(name, color, icon);
    console.log('userContext %d created', userContext.id);
    if (isUnnamed) {
      userContext = await userContext.updateProperties(
        browser.i18n.getMessage('defaultContainerName', String(userContext.id)),
        color,
        icon
      );
    }
    return userContext;
  }

  public async updateProperties(aUserContext: UserContext, aName: string, aColor: string, aIcon: string): Promise<UserContext> {
    const color = this.validateColor(aColor);
    const icon = this.validateIcon(aIcon);
    let name = this.validateName(aName);
    const isUnnamed = '' === name;
    if (isUnnamed) {
      name = browser.i18n.getMessage('defaultContainerName', String(aUserContext.id));
    }
    return aUserContext.updateProperties(name, color, icon);
  }
}
