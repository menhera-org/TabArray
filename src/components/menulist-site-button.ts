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

import { EventSink } from '../frameworks/utils';

export class MenulistSiteButtonElement extends HTMLButtonElement {
  private readonly _buttonTextElement: HTMLSpanElement;
  private readonly _siteCloseButton: HTMLButtonElement;
  private readonly _tabIconElement: HTMLSpanElement;
  private readonly _tabLabelElement: HTMLSpanElement;

  public readonly onCloseClicked = new EventSink<void>();

  public constructor() {
    super();

    this._buttonTextElement = document.createElement('span');
    this._buttonTextElement.classList.add('button-text');
    this.appendChild(this._buttonTextElement);

    this._siteCloseButton = document.createElement('button');
    this._siteCloseButton.classList.add('site-close');
    this._siteCloseButton.addEventListener('click', (ev) => {
      ev.stopImmediatePropagation();
      this.onCloseClicked.dispatch();
    });
    this.appendChild(this._siteCloseButton);

    const siteElement = document.createElement('span');
    siteElement.classList.add('site');
    this.appendChild(siteElement);

    this._tabIconElement = document.createElement('span');
    this._tabIconElement.classList.add('tab-icon');
    siteElement.appendChild(this._tabIconElement);

    this._tabLabelElement = document.createElement('span');
    this._tabLabelElement.classList.add('tab-label');
    siteElement.appendChild(this._tabLabelElement);
  }

  public get iconIsMasked(): boolean {
    return this._tabIconElement.classList.contains('masked');
  }

  public set iconIsMasked(value: boolean) {
    if (value) {
      this._tabIconElement.classList.add('masked');
    } else {
      this._tabIconElement.classList.remove('masked');
    }
  }

  public get siteDomain(): string {
    return this._buttonTextElement.textContent ?? '';
  }

  public set siteDomain(value: string) {
    this._buttonTextElement.textContent = value;
  }

  public get tabCountString(): string {
    return this._buttonTextElement.dataset.tabCount ?? '';
  }

  public set tabCountString(value: string | undefined) {
    this._buttonTextElement.dataset.tabCount = value;
  }

  public get tabIcon(): string {
    return this._tabIconElement.dataset.src || '';
  }

  public set tabIcon(iconUrl: string) {
    this._tabIconElement.dataset.src = iconUrl;
    if (this.iconIsMasked) {
      this._tabIconElement.style.mask = `url(${iconUrl}) center center / 75% no-repeat`;
      this._tabIconElement.style.backgroundImage = '';
    } else {
      this._tabIconElement.style.mask = '';
      this._tabIconElement.style.backgroundImage = `url(${iconUrl})`;
    }
  }

  public get tabLabel(): string {
    return this._tabLabelElement.textContent ?? '';
  }

  public set tabLabel(value: string) {
    this._tabLabelElement.textContent = value;
  }
}

customElements.define('menulist-site-button', MenulistSiteButtonElement, { extends: 'button' });
