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

import { TabGroupListingElement } from './tab-group-listing';

export class TabGroupSorterElement extends TabGroupListingElement {
  private readonly _tabGroupOptionDirectory = this.tabGroupService.optionDirectory;

  public constructor() {
    const autoCleanColumnName = browser.i18n.getMessage('enableCookiesAutoclean');
    super(true, '/css/components/tab-group-sorter.css', [autoCleanColumnName]);
  }

  private createOptionsElement(cookieStoreId: string): HTMLDivElement {
    const options = document.createElement('div');
    options.classList.add('options');
    options.classList.add('browser-style');
    const autocleanCheckbox = document.createElement('input');
    autocleanCheckbox.type = 'checkbox';

    this._tabGroupOptionDirectory.getAutocleanEnabledTabGroupIds().then((tabGroupIds) => {
      if (tabGroupIds.includes(cookieStoreId)) {
        autocleanCheckbox.checked = true;
      } else {
        autocleanCheckbox.checked = false;
      }
    });
    autocleanCheckbox.addEventListener('change', () => {
      this._tabGroupOptionDirectory.setAutocleanForTabGroupId(cookieStoreId, autocleanCheckbox.checked).catch((e) => {
        console.error(e);
      });
    });
    options.appendChild(autocleanCheckbox);
    return options;
  }

  protected override createColumnElement(columnId: number, tabGroupId: string): HTMLElement {
    if (columnId == 0) {
      return this.createOptionsElement(tabGroupId);
    }
    throw new Error('Invalid column id');
  }
}

customElements.define('tab-group-sorter', TabGroupSorterElement);
