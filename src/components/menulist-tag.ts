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
import { EventSink } from "weeg-events";

export class MenulistTagElement extends HTMLElement {
  private _tabCount = 0;

  public readonly onGroupClose = new EventSink<void>();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
    this.tagCloseButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this.tabCount = 0;
    this.registerEventListeners();
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-tag.css';
    this.shadowRoot?.appendChild(styleSheet);

    const groupElement = document.createElement('div');
    groupElement.id = 'group';
    this.shadowRoot?.appendChild(groupElement);

    const groupHeaderElement = document.createElement('div');
    groupHeaderElement.id = 'group-header';
    groupElement.appendChild(groupHeaderElement);

    const groupButton = document.createElement('button');
    groupButton.id = 'group-button';
    groupHeaderElement.appendChild(groupButton);

    const groupIconElement = document.createElement('span');
    groupIconElement.id = 'group-icon';
    groupButton.appendChild(groupIconElement);

    const groupNameElement = document.createElement('span');
    groupNameElement.id = 'group-name';
    groupButton.appendChild(groupNameElement);

    const groupCloseButton = document.createElement('button');
    groupCloseButton.id = 'group-close-button';
    groupHeaderElement.appendChild(groupCloseButton);

    const groupTabsElement = document.createElement('div');
    groupTabsElement.id = 'group-tabs';
    groupElement.appendChild(groupTabsElement);

    const slotElement = document.createElement('slot');
    groupTabsElement.appendChild(slotElement);
  }

  private registerEventListeners() {
    this.tagCloseButton.onclick = () => {
      this.onGroupClose.dispatch();
    };
  }

  private get tagNameElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#group-name') as HTMLSpanElement;
  }

  private get tagCloseButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-close-button') as HTMLButtonElement;
  }

  public get groupName(): string {
    return this.tagNameElement.textContent || '';
  }

  public set groupName(groupName: string) {
    this.tagNameElement.textContent = groupName;
  }

  public get tabCount(): number {
    return this._tabCount;
  }

  public set tabCount(tabCount: number) {
    this._tabCount = tabCount;
    this.tagNameElement.dataset.tabCount = String(tabCount);
    if (0 == tabCount) {
      this.tagCloseButton.disabled = true;
    } else {
      this.tagCloseButton.disabled = false;
    }
  }
}

customElements.define('menulist-tag', MenulistTagElement);
