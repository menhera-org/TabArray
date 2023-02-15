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
import { UserContext } from "../frameworks/tabGroups";
import { Uint32 } from '../frameworks/types';
import { EventSink } from '../frameworks/utils';

/**
 * You must set tabCount to an appropriate value.
 */
export class PanoramaContainerElement extends HTMLElement {
  private _userContextId = 0;
  private _containerHeadingElement: HTMLDivElement;
  private _containerIconElement: HTMLDivElement;
  private _containerLabelElement: HTMLAnchorElement;
  private _containerCloseButtonElement: HTMLButtonElement;
  private _containerTabsElement: HTMLDivElement;
  private _newTabButtonElement: HTMLButtonElement;

  public readonly onNewTabButtonClick = new EventSink<number>();

  public constructor(userContext: UserContext = UserContext.DEFAULT) {
    super();
    this._containerHeadingElement = document.createElement('div');
    this.append(this._containerHeadingElement);
    this._containerHeadingElement.classList.add('container-heading');
    this._containerHeadingElement.dataset.tabCount = '0';

    this._containerIconElement = document.createElement('div');
    this._containerHeadingElement.append(this._containerIconElement);
    this._containerIconElement.classList.add('container-icon');

    this._containerLabelElement = document.createElement('a');
    this._containerHeadingElement.append(this._containerLabelElement);
    this._containerLabelElement.classList.add('container-label');

    this._containerCloseButtonElement = document.createElement('button');
    this._containerHeadingElement.append(this._containerCloseButtonElement);
    this._containerCloseButtonElement.classList.add('container-close');
    this._containerCloseButtonElement.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this._containerCloseButtonElement.addEventListener('click', async () => {
      const tabGroup = await UserContext.createIncompleteUserContext(this._userContextId as Uint32.Uint32).getTabGroup();
      await tabGroup.tabList.closeTabs();
    });

    this._containerTabsElement = document.createElement('div');
    this.append(this._containerTabsElement);
    this._containerTabsElement.classList.add('container-tabs');

    this._newTabButtonElement = document.createElement('button');
    this._containerTabsElement.append(this._newTabButtonElement);
    this._newTabButtonElement.classList.add('container-new-tab');
    this._newTabButtonElement.textContent = browser.i18n.getMessage('buttonOpenTabInContainer');
    this._newTabButtonElement.addEventListener('click', () => {
      this.onNewTabButtonClick.dispatch(this._userContextId);
    });

    this.setUserContext(userContext);
  }

  public setUserContext(userContext: UserContext): void {
    this._userContextId = userContext.id;
    const iconUrl = userContext.iconUrl || '/img/material-icons/category.svg';
    if (iconUrl.includes(')')) {
      throw new Error(`Invalid icon URL: ${iconUrl}`);
    }
    this._containerIconElement.style.mask = `url(${iconUrl}) center center/75% no-repeat`;
    this._containerIconElement.style.backgroundColor = userContext.colorCode || '#000000';
    this._containerLabelElement.textContent = userContext.name;
  }

  public get tabCount(): number {
    return Number(this._containerHeadingElement.dataset.tabCount);
  }

  public set tabCount(tabCount: number) {
    this._containerHeadingElement.dataset.tabCount = String(tabCount);
  }

  public get containerTabsElement(): HTMLDivElement {
    return this._containerTabsElement;
  }

  public get containerName(): string {
    return this._containerLabelElement.textContent ?? '';
  }

  public get targetId(): string {
    return this.id;
  }

  public set targetId(targetId: string) {
    this.id = targetId;
    this._containerLabelElement.href = `#${targetId}`;
  }
}

customElements.define('panorama-container', PanoramaContainerElement);
