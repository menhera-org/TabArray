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

export class MenulistSupergroupElement extends HTMLElement {
  private _tabCount = 0;

  public readonly onGroupHide = new EventSink<void>();
  public readonly onGroupUnhide = new EventSink<void>();
  public readonly onGroupClose = new EventSink<void>();
  public readonly onGroupOptionsClick = new EventSink<void>();

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
    this.groupCloseButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this.groupHideButton.title = browser.i18n.getMessage('tooltipCollapseContainers');
    this.groupUnhideButton.title = browser.i18n.getMessage('tooltipExpandContainers');
    this.tabCount = 0;
    this.registerEventListeners();
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-supergroup.css';
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

    const groupNameInnerElement = document.createElement('span');
    groupNameInnerElement.id = 'group-name-inner';
    groupNameElement.appendChild(groupNameInnerElement);

    const groupHideButton = document.createElement('button');
    groupHideButton.id = 'group-hide-button';
    groupHeaderElement.appendChild(groupHideButton);

    const groupUnhideButton = document.createElement('button');
    groupUnhideButton.id = 'group-unhide-button';
    groupHeaderElement.appendChild(groupUnhideButton);

    const groupOptionsButton = document.createElement('button');
    groupOptionsButton.id = 'group-options-button';
    groupHeaderElement.appendChild(groupOptionsButton);

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
    this.groupCloseButton.onclick = () => {
      this.onGroupClose.dispatch();
    };
    this.groupOptionsButton.onclick = () => {
      this.onGroupOptionsClick.dispatch();
    };
    this.groupHideButton.onclick = () => {
      this.onGroupHide.dispatch();
    };
    this.groupUnhideButton.onclick = () => {
      this.onGroupUnhide.dispatch();
    };
  }

  private get groupNameElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#group-name') as HTMLSpanElement;
  }

  private get groupNameInnerElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#group-name-inner') as HTMLSpanElement;
  }

  private get groupCloseButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-close-button') as HTMLButtonElement;
  }

  private get groupOptionsButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-options-button') as HTMLButtonElement;
  }

  public get groupHideButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-hide-button') as HTMLButtonElement;
  }

  public get groupUnhideButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-unhide-button') as HTMLButtonElement;
  }

  public get groupName(): string {
    return this.groupNameInnerElement.textContent || '';
  }

  public set groupName(groupName: string) {
    this.groupNameInnerElement.textContent = groupName;
    this.groupOptionsButton.title = browser.i18n.getMessage('groupOptions', groupName);
  }

  public get tabCount(): number {
    return this._tabCount;
  }

  public set tabCount(tabCount: number) {
    this._tabCount = tabCount;
    this.groupNameElement.dataset.tabCount = String(tabCount);
    if (0 == tabCount) {
      this.groupCloseButton.disabled = true;
      this.groupHideButton.disabled = true;
      this.groupUnhideButton.disabled = true;
    } else {
      this.groupCloseButton.disabled = false;
      this.groupHideButton.disabled = false;
      this.groupUnhideButton.disabled = false;
    }
  }
}

customElements.define('menulist-supergroup', MenulistSupergroupElement);
