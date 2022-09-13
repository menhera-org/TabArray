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

export class ExtensionService {
  private static readonly INSTANCE = new ExtensionService();

  public static getInstance() {
    return ExtensionService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public getInternalUuid(): string {
    return new URL(browser.runtime.getURL('/')).hostname;
  }

  public getVersion(): string {
    return browser.runtime.getManifest().version;
  }

  public async isAllowedInPrivateBrowsing(): Promise<boolean> {
    const allowed = await browser.extension.isAllowedIncognitoAccess();
    return allowed;
  }
}
