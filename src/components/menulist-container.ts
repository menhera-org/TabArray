/* eslint-disable */
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import browser from 'webextension-polyfill';
import { DisplayedContainer } from 'weeg-containers';
import { EventSink } from "weeg-events";

import { CompatConsole } from '../lib/console/CompatConsole';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class MenulistContainerElement extends HTMLElement {
  public partialContainerView = false;
  private _tabCount = 0;
  private _hidden = false;
  private readonly _isPrivate;
  private readonly _cookieStoreId: string;

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

  public constructor(displayedContainer: DisplayedContainer, isPrivate = false) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this._isPrivate = isPrivate || displayedContainer.cookieStore.isPrivate;
    this._cookieStoreId = displayedContainer.cookieStore.id;
    this.buildElement();
    this.setDisplayedContainer(displayedContainer);
    this.containerCloseButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
    this.containerOptionsButton.title = browser.i18n.getMessage('containerOptions', displayedContainer.name);
    this.containerVisibilityToggleButton.title = browser.i18n.getMessage('tooltipHideContainerButton');
    this.containerHighlightButton.title = browser.i18n.getMessage('focusToThisContainer');
    this.tabCount = 0;
    this.registerEventListeners();
    this.setupDragHandlers();
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-container.css';
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

    const containerNameInnerElement = document.createElement('span');
    containerNameInnerElement.id = 'container-name-inner';
    containerNameElement.appendChild(containerNameInnerElement);

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
      if (!this.containerHidden) {
        this.onContainerClick.dispatch();
      } else {
        this.onContainerUnhide.dispatch();
      }
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
    this.setupClickHandlers();
  }

  private setupDragHandlers() {
    const containerTabsElement = this.shadowRoot?.querySelector('#container-tabs') as HTMLDivElement | null;
    if (!containerTabsElement) return;

    containerTabsElement.addEventListener('dragstart', (ev: DragEvent) => {
      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement || !ev.dataTransfer) return;

      const tabId = parseInt(tabElement.getAttribute('data-tab-id') || '-1', 10);
      const tabIndex = parseInt(tabElement.getAttribute('data-index') || '0', 10);
      if (tabId === -1) return;

      ev.dataTransfer.setData('application/json', JSON.stringify({
        type: 'tab',
        id: tabId,
        index: tabIndex,
        pinned: false,
        cookieStoreId: this._cookieStoreId,
      }));
      ev.dataTransfer.dropEffect = 'move';
    });

    containerTabsElement.addEventListener('dragover', (ev: DragEvent) => {
      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement || !ev.dataTransfer) return;

      const json = ev.dataTransfer.getData('application/json');
      if (!json) return;

      try {
        const data = JSON.parse(json);
        if ('tab' !== data.type || data.pinned) return;
        if (data.cookieStoreId !== this._cookieStoreId) return;
        ev.preventDefault();
      } catch (_e) {
        // Invalid JSON, ignore
      }
    });

    containerTabsElement.addEventListener('drop', (ev: DragEvent) => {
      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement || !ev.dataTransfer) return;

      const targetTabId = parseInt(tabElement.getAttribute('data-tab-id') || '-1', 10);
      const targetIndex = parseInt(tabElement.getAttribute('data-index') || '0', 10);
      if (targetTabId === -1) return;

      const json = ev.dataTransfer.getData('application/json');
      if (!json) return;

      try {
        const data = JSON.parse(json);
        if ('tab' !== data.type || data.pinned) return;
        if (data.cookieStoreId !== this._cookieStoreId) return;
        ev.preventDefault();

        browser.tabs.move(data.id, { index: targetIndex }).catch((e) => {
          console.error(e);
        });
      } catch (_e) {
        // Invalid JSON, ignore
      }
    });
  }

  private setupClickHandlers(): void {
    const containerTabsElement = this.shadowRoot?.querySelector('#container-tabs') as HTMLDivElement | null;
    if (!containerTabsElement) return;

    // Click event delegation
    containerTabsElement.addEventListener('click', (ev: MouseEvent) => {
      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement) return;

      const tabId = parseInt(tabElement.getAttribute('data-tab-id') || '-1', 10);
      if (tabId === -1) return;

      // Get the actual clicked element from composedPath (for Shadow DOM)
      const path = ev.composedPath();
      const shadowTarget = path[0] as HTMLElement;
      const action = shadowTarget.getAttribute?.('data-action') || shadowTarget.closest('[data-action]')?.getAttribute('data-action');

      if (!action) return;

      switch (action) {
        case 'tab-click':
          // Focus the tab
          browser.tabs.update(tabId, { active: true }).catch((e) => {
            console.error('Failed to focus tab:', e);
          });
          break;

        case 'close':
          // Close the tab
          browser.tabs.remove(tabId).catch((e) => {
            console.error('Failed to close tab:', e);
          });
          break;

        case 'pin':
          // Toggle pin status
          const isPinned = tabElement.querySelector('#tab-pin-button')?.classList.contains('pinned');
          browser.tabs.update(tabId, { pinned: !isPinned }).catch((e) => {
            console.error('Failed to pin/unpin tab:', e);
          });
          break;

        case 'set-tag':
          // Import ModalSetTagElement dynamically to avoid circular dependency
          import('./modal-set-tag').then(({ ModalSetTagElement }) => {
            document.body.appendChild(new ModalSetTagElement(tabId));
          }).catch((e) => {
            console.error('Failed to load ModalSetTagElement:', e);
          });
          break;
      }
    });

    // Auxclick event (middle mouse button)
    containerTabsElement.addEventListener('auxclick', (ev: MouseEvent) => {
      if (ev.button !== 1) return; // Only handle middle click

      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement) return;

      const tabId = parseInt(tabElement.getAttribute('data-tab-id') || '-1', 10);
      if (tabId === -1) return;

      // Middle click closes the tab
      browser.tabs.remove(tabId).catch((e) => {
        console.error('Failed to close tab:', e);
      });
    });

    // Contextmenu event
    containerTabsElement.addEventListener('contextmenu', (ev: MouseEvent) => {
      const tabElement = (ev.target as HTMLElement).closest('menulist-tab') as HTMLElement | null;
      if (!tabElement) return;

      const tabId = parseInt(tabElement.getAttribute('data-tab-id') || '-1', 10);
      if (tabId === -1) return;

      // Override context menu for Firefox
      browser.menus.overrideContext({
        context: 'tab',
        tabId: tabId,
      });
    }, { capture: true });
  }


  public setDisplayedContainer(displayedContainer: DisplayedContainer) {
    if (this._isPrivate) {
      console.assert(displayedContainer.cookieStore.userContextId == 0, "Private window should have default container only");
      this.containerNameInnerElement.textContent = browser.i18n.getMessage('privateBrowsing');
      this.containerButton.title = browser.i18n.getMessage('privateBrowsing');
      this.containerIconElement.style.background = 'url(/img/firefox-icons/private-browsing-icon.svg) center center / contain no-repeat';
      this.containerIconElement.style.backgroundColor = 'transparent';
    } else {
      this.containerNameInnerElement.textContent = displayedContainer.name;
      this.containerButton.title = browser.i18n.getMessage('defaultContainerName', String(displayedContainer.cookieStore.userContextId));
      this.containerIconElement.style.backgroundColor = displayedContainer.colorCode;
      const iconUrl = displayedContainer.iconUrl;
      if (!iconUrl.includes(')')) {
        this.containerIconElement.style.mask = `url(${iconUrl}) center center / contain no-repeat`;
      }
    }
  }

  private get containerNameElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#container-name') as HTMLSpanElement;
  }

  private get containerNameInnerElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#container-name-inner') as HTMLSpanElement;
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
    return this.containerNameInnerElement.textContent || '';
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
