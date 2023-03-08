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

import { AbstractFragmentBuilder } from "./AbstractFragmentBuilder";
import { CtgFragmentElement } from "../../components/ctg/ctg-fragment";
import { CtgTopBarElement } from "../../components/ctg/ctg-top-bar";
import { CtgMenuItemElement } from "../../components/ctg/ctg-menu-item";
import browser from "webextension-polyfill";
import { ContainersStateSnapshot } from "../../frameworks/tabs/ContainersStateSnapshot";

export class ContainersFragmentBuilder extends AbstractFragmentBuilder {
  private _containerCount = 0;

  public getFragmentId(): string {
    return 'fragment-containers';
  }

  public getLabelText(): string {
    return browser.i18n.getMessage('menuItemMain');
  }

  public getIconUrl(): string {
    return '/img/material-icons/folder.svg';
  }

  public build(): CtgFragmentElement {
    const fragment = document.createElement('ctg-fragment') as CtgFragmentElement;
    fragment.id = this.getFragmentId();
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Containers';
    fragment.appendChild(paragraph);
    return fragment;
  }

  public renderTopBar(topBarElement: CtgTopBarElement): void {
    topBarElement.clearMenuItems();
    topBarElement.clearOverflowMenuItems();

    const newContainerMenuItem = new CtgMenuItemElement();
    newContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newContainerMenuItem.iconSrc = '/img/material-icons/create_new_folder.svg';
    topBarElement.addMenuItem('new-container', newContainerMenuItem);

    const newNormalContainerMenuItem = new CtgMenuItemElement();
    newNormalContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewContainer');
    newNormalContainerMenuItem.iconSrc = '/img/material-icons/create_new_folder.svg';
    newContainerMenuItem.appendChild(newNormalContainerMenuItem);

    const newTemporaryContainerMenuItem = new CtgMenuItemElement();
    newTemporaryContainerMenuItem.labelText = browser.i18n.getMessage('buttonNewTemporaryContainer');
    newTemporaryContainerMenuItem.iconSrc = '/img/material-icons/timelapse.svg';
    newContainerMenuItem.appendChild(newTemporaryContainerMenuItem);

    // TODO: add i18n string
    const labelText = this.getLabelText();
    topBarElement.headingText = `${labelText} (${this._containerCount.toFixed(0)})`;
  }

  public render(containersStateSnapshot: ContainersStateSnapshot): void {
    this._containerCount = containersStateSnapshot.containerAttributes.length;
    if (this.active) {
      this.renderTopBarWithGlobalItems();
    }
  }
}
