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
import { EventSink } from '../frameworks/utils';

export class MenulistWindowElement extends HTMLElement {
  private _nameElement: HTMLDivElement;
  private _windowId = -1;
  private _isCurrentWindow = false;
  private _collapseButtonElement: HTMLButtonElement;
  private _expandButtonElement: HTMLButtonElement;
  private _closeButtonElement: HTMLButtonElement;

  public readonly onNameClicked = new EventSink<void>();
  public readonly onCollapseButtonClicked = new EventSink<void>();
  public readonly onExpandButtonClicked = new EventSink<void>();
  public readonly onCloseButtonClicked = new EventSink<void>();

  constructor(windowId = -1, isCurrentWindow = false) {
    super();
    this._isCurrentWindow = isCurrentWindow;
    this.windowId = windowId;
    this.classList.add('window-label');

    this._nameElement = this.createNameElement();
    this.appendChild(this._nameElement);

    this._collapseButtonElement = this.createCollapseButtonElement();
    this.appendChild(this._collapseButtonElement);

    this._expandButtonElement = this.createExpandButtonElement();
    this.appendChild(this._expandButtonElement);

    this._closeButtonElement = this.createCloseButtonElement();
    this.appendChild(this._closeButtonElement);

    if (windowId < 0) {
      this._closeButtonElement.disabled = true;
    }
    if (!isCurrentWindow) {
      this._collapseButtonElement.disabled = true;
      this._expandButtonElement.disabled = true;
    }
  }

  private createNameElement(): HTMLDivElement {
    const nameElement = document.createElement('div');
    nameElement.classList.add('window-label-name');
    nameElement.onclick = () => this.onNameClicked.dispatch();
    return nameElement;
  }

  private createCollapseButtonElement(): HTMLButtonElement {
    const collapseButtonElement = document.createElement('button');
    collapseButtonElement.classList.add('window-collapse-button');
    collapseButtonElement.title = browser.i18n.getMessage('tooltipCollapseContainers');
    collapseButtonElement.onclick = () => {
      this.onCollapseButtonClicked.dispatch();
    };
    return collapseButtonElement;
  }

  private createExpandButtonElement(): HTMLButtonElement {
    const expandButtonElement = document.createElement('button');
    expandButtonElement.classList.add('window-expand-button');
    expandButtonElement.title = browser.i18n.getMessage('tooltipExpandContainers');
    expandButtonElement.onclick = () => {
      this.onExpandButtonClicked.dispatch();
    };
    return expandButtonElement;
  }

  private createCloseButtonElement(): HTMLButtonElement {
    const closeButtonElement = document.createElement('button');
    closeButtonElement.classList.add('window-close-button');
    closeButtonElement.title = browser.i18n.getMessage('tooltipCloseWindow');
    closeButtonElement.onclick = () => {
      this.onCloseButtonClicked.dispatch();
    };
    return closeButtonElement;
  }

  get windowName(): string {
    return this._nameElement.innerText;
  }

  set windowName(name: string) {
    this._nameElement.innerText = name;
  }

  get windowId(): number {
    return this._windowId;
  }

  set windowId(windowId: number) {
    this._windowId = windowId;
    if (windowId > 0) {
      if (this._isCurrentWindow) {
        this.windowName = browser.i18n.getMessage('currentWindow', String(windowId));
      } else {
        this.windowName = browser.i18n.getMessage('windowLabel', String(windowId));
        this._nameElement.title = browser.i18n.getMessage('tooltipWindowLabel', String(windowId));
      }
    }
  }

  get collapseButtonElement(): HTMLButtonElement {
    return this._collapseButtonElement;
  }

  get expandButtonElement(): HTMLButtonElement {
    return this._expandButtonElement;
  }

  get closeButtonElement(): HTMLButtonElement {
    return this._closeButtonElement;
  }
}

customElements.define('menulist-window', MenulistWindowElement);
