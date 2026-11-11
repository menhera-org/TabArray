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

import { CtgTopBarElement } from '../../components/ctg/ctg-top-bar';
import { CtgMenuItemElement } from '../../components/ctg/ctg-menu-item';

import { getGlobalMenuActions } from '../popup-v2/globalMenu';

/** Puts the popup's global menu items on a <ctg-top-bar>. */
export class GlobalMenuItems {
  public defineTopBarMenuItems(topBarElement: CtgTopBarElement) {
    for (const action of getGlobalMenuActions(document.body.classList.contains('popup'))) {
      const menuItem = new CtgMenuItemElement();
      menuItem.labelText = browser.i18n.getMessage(action.label);
      if (action.icon) menuItem.iconSrc = action.icon;
      if (action.iconInColor) menuItem.iconMode = 'normal';
      menuItem.addEventListener('click', action.run);
      if (action.overflow) {
        topBarElement.addOverflowMenuItem(action.id, menuItem);
      } else {
        topBarElement.addMenuItem(action.id, menuItem);
      }
    }
  }
}
