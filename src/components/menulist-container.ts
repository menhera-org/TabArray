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
import { UserContext } from "../frameworks/tabGroups";
import { EventSink } from '../frameworks/utils';

export class MenulistContainerElement extends HTMLElement {
  private static readonly TEMPLATE= `
    <div id='container'>
      <div id='container-header'>
        <button id='container-visibility-toggle'></button>
        <button id='container-button'>
          <span id='container-icon'></span>
          <span id='container-name'></span>
        </button>
        <button id='container-edit-button'></button>
        <button id='container-close-button'></button>
        <button id='container-delete-button'></button>
      </div>
      <div id='container-tabs'>
        <slot></slot>
      </div>
    </div>
  `;

  private _tabCount = 0;
  private _hidden = false;

  public readonly onContainerHide = new EventSink<void>();
  public readonly onContainerUnhide = new EventSink<void>();
  public readonly onContainerClick = new EventSink<void>();
  public readonly onContainerEdit = new EventSink<void>();
  public readonly onContainerClose = new EventSink<void>();
  public readonly onContainerDelete = new EventSink<void>();

  public constructor(userContext: UserContext = UserContext.DEFAULT) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.shadowRoot.innerHTML = MenulistContainerElement.TEMPLATE;
    this.setUserContext(userContext);
    this.containerCloseButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this.containerDeleteButton.title = browser.i18n.getMessage('tooltipContainerDelete');
    this.containerEditButton.title = browser.i18n.getMessage('tooltipEditContainerButton');
    this.containerVisibilityToggleButton.title = browser.i18n.getMessage('tooltipHideContainerButton');
    this.tabCount = 0;
    this.registerEventListeners();
  }

  private registerEventListeners() {
    this.containerVisibilityToggleButton.onclick = () => {
      if (!this.containerHidden) {
        this.onContainerHide.dispatch();
      } else {
        this.onContainerUnhide.dispatch();
      }
    };
    this.containerButton.onclick = () => {
      this.onContainerClick.dispatch();
    };
    this.containerCloseButton.onclick = () => {
      this.onContainerClose.dispatch();
    };
    this.containerDeleteButton.onclick = () => {
      this.onContainerDelete.dispatch();
    };
    this.containerEditButton.onclick = () => {
      this.onContainerEdit.dispatch();
    };
  }

  public setUserContext(userContext: UserContext) {
    this.containerNameElement.textContent = userContext.name;
    this.containerIconElement.style.backgroundColor = userContext.colorCode;
    this.containerButton.title = browser.i18n.getMessage('defaultContainerName', String(userContext.id));
    const iconUrl = userContext.iconUrl;
    if (!iconUrl.includes(')')) {
      this.containerIconElement.style.mask = `url(${iconUrl}) center center / contain no-repeat`;
    }
    if (userContext.id == 0) {
      this.containerEditButton.disabled = true;
      this.containerDeleteButton.disabled = true;
    }
  }

  private get containerNameElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#container-name') as HTMLSpanElement;
  }

  private get containerIconElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#container-icon') as HTMLSpanElement;
  }

  private get containerButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-button') as HTMLButtonElement;
  }

  private get containerElement(): HTMLDivElement {
    return this.shadowRoot?.querySelector('#container') as HTMLDivElement;
  }

  private get containerEditButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-edit-button') as HTMLButtonElement;
  }

  private get containerCloseButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-close-button') as HTMLButtonElement;
  }

  private get containerDeleteButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-delete-button') as HTMLButtonElement;
  }

  public get containerVisibilityToggleButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-visibility-toggle') as HTMLButtonElement;
  }

  public get containerName(): string {
    return this.containerNameElement.textContent || '';
  }

  public get tabCount(): number {
    return this._tabCount;
  }

  public set tabCount(tabCount: number) {
    this._tabCount = tabCount;
    this.containerNameElement.dataset.tabCount = String(tabCount);
    if (0 == tabCount) {
      this.containerVisibilityToggleButton.disabled = true;
      this.containerCloseButton.disabled = true;
    }
  }

  public get containerHidden(): boolean {
    return this._hidden;
  }

  public set containerHidden(hidden: boolean) {
    this._hidden = hidden;
    if (hidden) {
      this.containerElement.classList.add('hidden');
      this.containerVisibilityToggleButton.title = browser.i18n.getMessage('tooltipUnhideContainerButton');
    } else {
      this.containerElement.classList.remove('hidden');
      this.containerVisibilityToggleButton.title = browser.i18n.getMessage('tooltipHideContainerButton');
    }
  }
}

customElements.define('menulist-container', MenulistContainerElement);
