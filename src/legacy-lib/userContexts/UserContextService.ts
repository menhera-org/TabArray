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
import { UserContext } from "../tabGroups/UserContext";

export class UserContextService {
  private static readonly DEFAULT_ICON_URL = browser.runtime.getURL('/img/material-icons/category.svg');
  private static readonly DEFAULT_COLOR_CODE = '#7c7c7d';

  private static readonly INSTANCE = new UserContextService();

  public static getInstance(): UserContextService {
    return UserContextService.INSTANCE;
  }

  private constructor() {
    // nothing to do.
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
}
