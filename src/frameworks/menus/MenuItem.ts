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
import { EventSink } from '../utils';
import { Tab } from '../tabs';

export type OnClickData = browser.Menus.OnClickData & {
  tab?: Tab;
};

export type OnShownData = browser.Menus.OnShownInfoType & {
  tab?: Tab;
};

export class MenuItem {
  private readonly _menuId: string;

  public readonly onClicked = new EventSink<OnClickData>();
  public readonly onShown = new EventSink<OnShownData>();

  public constructor(createProperties: browser.Menus.CreateCreatePropertiesType) {
    const menuId = browser.menus.create(createProperties);
    if ('string' !== typeof menuId) {
      throw new Error('Failed to create menu item');
    }
    this._menuId = menuId;
    browser.menus.onClicked.addListener((info, browserTab) => {
      if (info.menuItemId !== this._menuId) return;
      const tab = browserTab ? new Tab(browserTab) : undefined;
      this.onClicked.dispatch({ ...info, tab });
    });
    browser.menus.onShown.addListener((info, browserTab) => {
      if (info.menuIds.indexOf(this._menuId) < 0) return;
      const tab = browserTab ? new Tab(browserTab) : undefined;
      this.onShown.dispatch({ ...info, tab });
    });
  }

  public get id(): string {
    return this._menuId;
  }

  public disable(): void {
    browser.menus.update(this._menuId, { enabled: false });
    browser.menus.refresh();
  }

  public enable(): void {
    browser.menus.update(this._menuId, { enabled: true });
    browser.menus.refresh();
  }

  public setTitle(title: string): void {
    browser.menus.update(this._menuId, { title });
    browser.menus.refresh();
  }
}
