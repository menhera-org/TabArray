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
import { UserContext } from "../legacy-lib/tabGroups";
import { EventSink } from "weeg-events";

export class MenulistContainerElement extends HTMLElement {
  public partialContainerView = false;
  private _tabCount = 0;
  private _hidden = false;
  private readonly _isPrivate;

  public readonly onContainerHide = new EventSink<void>();
  public readonly onContainerUnhide = new EventSink<void>();
  public readonly onContainerClick = new EventSink<void>();
  public readonly onContainerClose = new EventSink<void>();
  public readonly onContainerOptionsClick = new EventSink<void>();
  public readonly onContainerHighlight = new EventSink<void>();

  // unused.
  public readonly onContainerEdit = new EventSink<void>();
  public readonly onContainerDelete = new EventSink<void>();
  public readonly onContainerClearCookie = new EventSink<void>();

  public constructor(userContext: UserContext = UserContext.DEFAULT, isPrivate = false) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this._isPrivate = isPrivate || userContext.markedAsPrivate;
    this.buildElement();
    this.setUserContext(userContext);
    this.containerCloseButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this.containerOptionsButton.title = browser.i18n.getMessage('containerOptions', userContext.name);
    this.containerVisibilityToggleButton.title = browser.i18n.getMessage('tooltipHideContainerButton');
    this.containerHighlightButton.title = browser.i18n.getMessage('focusToThisContainer');
    this.tabCount = 0;
    this.registerEventListeners();
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/menulist-container.css';
    this.shadowRoot?.appendChild(styleSheet);

    const containerElement = document.createElement('div');
    containerElement.id = 'container';
    this.shadowRoot?.appendChild(containerElement);

    const containerHeaderElement = document.createElement('div');
    containerHeaderElement.id = 'container-header';
    containerElement.appendChild(containerHeaderElement);

    const containerVisibilityToggleButton = document.createElement('button');
    containerVisibilityToggleButton.id = 'container-visibility-toggle';
    containerHeaderElement.appendChild(containerVisibilityToggleButton);

    const containerButton = document.createElement('button');
    containerButton.id = 'container-button';
    containerHeaderElement.appendChild(containerButton);

    const containerIconElement = document.createElement('span');
    containerIconElement.id = 'container-icon';
    containerButton.appendChild(containerIconElement);

    const containerNameElement = document.createElement('span');
    containerNameElement.id = 'container-name';
    containerButton.appendChild(containerNameElement);

    const containerHighlightButton = document.createElement('button');
    containerHighlightButton.id = 'container-highlight-button';
    containerHighlightButton.disabled = true;
    containerHeaderElement.appendChild(containerHighlightButton);

    const containerOptionsButton = document.createElement('button');
    containerOptionsButton.id = 'container-options-button';
    containerHeaderElement.appendChild(containerOptionsButton);

    const containerCloseButton = document.createElement('button');
    containerCloseButton.id = 'container-close-button';
    containerHeaderElement.appendChild(containerCloseButton);

    const containerTabsElement = document.createElement('div');
    containerTabsElement.id = 'container-tabs';
    containerElement.appendChild(containerTabsElement);

    const slotElement = document.createElement('slot');
    containerTabsElement.appendChild(slotElement);
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
    this.containerOptionsButton.onclick = () => {
      this.onContainerOptionsClick.dispatch();
    };
    this.containerHighlightButton.onclick = () => {
      this.onContainerHighlight.dispatch();
    };
  }

  public setUserContext(userContext: UserContext) {
    if (this._isPrivate) {
      console.assert(userContext.id == 0, "Private window should have default container only");
      this.containerNameElement.textContent = browser.i18n.getMessage('privateBrowsing');
      this.containerButton.title = browser.i18n.getMessage('privateBrowsing');
      this.containerIconElement.style.background = 'url(/img/firefox-icons/private-browsing-icon.svg) center center / contain no-repeat';
      this.containerIconElement.style.backgroundColor = 'transparent';
    } else {
      this.containerNameElement.textContent = userContext.name;
      this.containerButton.title = browser.i18n.getMessage('defaultContainerName', String(userContext.id));
      this.containerIconElement.style.backgroundColor = userContext.colorCode;
      const iconUrl = userContext.iconUrl;
      if (!iconUrl.includes(')')) {
        this.containerIconElement.style.mask = `url(${iconUrl}) center center / contain no-repeat`;
      }
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

  private get containerCloseButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-close-button') as HTMLButtonElement;
  }

  private get containerOptionsButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-options-button') as HTMLButtonElement;
  }

  private get containerHighlightButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-highlight-button') as HTMLButtonElement;
  }

  public get containerVisibilityToggleButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#container-visibility-toggle') as HTMLButtonElement;
  }

  public get containerHighlightButtonEnabled(): boolean {
    return !this.containerHighlightButton.disabled;
  }

  public set containerHighlightButtonEnabled(enabled: boolean) {
    this.containerHighlightButton.disabled = !enabled;
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
    } else {
      if (!this.partialContainerView) {
        this.containerVisibilityToggleButton.disabled = false;
      }
      this.containerCloseButton.disabled = false;
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

  public override focus() {
    this.containerButton.focus();
  }

  public override click() {
    this.containerButton.click();
  }
}

customElements.define('menulist-container', MenulistContainerElement);
