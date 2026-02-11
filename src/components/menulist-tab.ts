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

import browser from 'webextension-polyfill';
import { EventSink } from "weeg-events";
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { TabIconService } from '../lib/TabIconService';

import { ModalSetTagElement } from './modal-set-tag';

export class MenulistTabElement extends HTMLElement {
  private _tabId = -1;
  private readonly _tabIconService = TabIconService.getInstance();

  public constructor(tab: CompatTab, displayedContainer: DisplayedContainer) {
    super();
    this.attachShadow({ mode: "open" });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
    this.setTab(tab);
    this.setDisplayedContainer(displayedContainer);
    this.closeButton.title = browser.i18n.getMessage('buttonTabClose');
    this.setTagButton.title = browser.i18n.getMessage('setTag');
    // this.privateIconElement.title = browser.i18n.getMessage('buttonTabPrivate');
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-tab.css';
    this.shadowRoot?.appendChild(styleSheet);

    const tabMenu = document.createElement('div');
    tabMenu.id = 'tab-menu';
    this.shadowRoot?.appendChild(tabMenu);

    const tabPrivateIcon = document.createElement('img');
    tabPrivateIcon.id = 'tab-private-icon';
    tabPrivateIcon.src = '/img/firefox-icons/private-browsing-icon.svg';
    tabMenu.appendChild(tabPrivateIcon);

    const tabMain = document.createElement('div');
    tabMain.id = 'tab-main';
    tabMenu.appendChild(tabMain);

    const tabPinButton = document.createElement('button');
    tabPinButton.id = 'tab-pin-button';
    tabPinButton.dataset.action = 'pin';
    tabMain.appendChild(tabPinButton);

    const tabButton = document.createElement('button');
    tabButton.id = 'tab-button';
    tabButton.dataset.action = 'tab-click';
    tabMain.appendChild(tabButton);

    const tabIcon = document.createElement('span');
    tabIcon.id = 'tab-icon';
    tabButton.appendChild(tabIcon);

    const tabTitle = document.createElement('span');
    tabTitle.id = 'tab-title';
    tabButton.appendChild(tabTitle);

    const tabSetTagButton = document.createElement('button');
    tabSetTagButton.id = 'tab-set-tag-button';
    tabSetTagButton.dataset.action = 'set-tag';
    tabMain.appendChild(tabSetTagButton);

    const tabCloseButton = document.createElement('button');
    tabCloseButton.id = 'tab-close-button';
    tabCloseButton.dataset.action = 'close';
    tabMain.appendChild(tabCloseButton);
  }

  public setTab(tab: CompatTab) {
    this._tabId = tab.id;
    this.setAttribute('data-tab-id', tab.id.toString());
    this.setAttribute('data-index', tab.index.toString());

    this.titleElement.textContent = tab.title;
    this.tabButton.title = tab.url;
    this.iconUrl = tab.favIconUrl;

    if (tab.pinned) {
      this.pinButton.classList.add("pinned");
      this.pinButton.title = browser.i18n.getMessage('tooltipTabUnpinButton');
    } else {
      this.pinButton.classList.remove("pinned");
      this.pinButton.title = browser.i18n.getMessage('tooltipTabPinButton');
    }

    if (tab.isPrivate) {
      this.privateIconElement.style.visibility = "visible";
    } else {
      this.privateIconElement.style.visibility = "hidden";
    }

    if (tab.discarded) {
      this.tabButton.classList.add("discarded");
    }

    if (tab.active) {
      this.tabButton.classList.add("active");
      // Scroll to center with a small delay to avoid initial render conflicts
      setTimeout(() => this.scrollIntoViewIfActive(), 100);
    }

  }

  public setDisplayedContainer(displayedContainer: DisplayedContainer) {
    if (0 == displayedContainer.cookieStore.userContextId || !displayedContainer.colorCode) {
      return;
    }
    this.tabMainElement.style.borderColor = displayedContainer.colorCode;
  }

  private scrollIntoViewIfActive(): void {
    // Scroll the active tab into view at the center of the sidebar
    // Using requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private getShadowElement(id: string): HTMLElement {
    const element = this.shadowRoot?.getElementById(id);
    if (!element) {
      throw new Error(`Element ${id} not found`);
    }
    return element as HTMLElement;
  }

  private getButton(id: string): HTMLButtonElement {
    const button = this.getShadowElement(id);
    return button as HTMLButtonElement;
  }

  private get pinButton(): HTMLButtonElement {
    return this.getButton("tab-pin-button");
  }

  private get tabButton(): HTMLButtonElement {
    return this.getButton("tab-button");
  }

  private get closeButton(): HTMLButtonElement {
    return this.getButton("tab-close-button");
  }

  private get setTagButton(): HTMLButtonElement {
    return this.getButton("tab-set-tag-button");
  }

  private get iconElement(): HTMLSpanElement {
    const icon = this.getShadowElement("tab-icon");
    return icon as HTMLSpanElement;
  }

  private get privateIconElement(): HTMLImageElement {
    const icon = this.getShadowElement("tab-private-icon");
    return icon as HTMLImageElement;
  }

  private get titleElement(): HTMLSpanElement {
    const title = this.getShadowElement("tab-title");
    return title as HTMLSpanElement;
  }

  private get tabMainElement(): HTMLDivElement {
    const element = this.getShadowElement("tab-main");
    return element as HTMLDivElement;
  }

  public get iconUrl(): string {
    return this.iconElement.dataset.iconUrl ?? '';
  }

  public set iconUrl(url: string) {
    this.iconElement.dataset.iconUrl = url;
    if (this._tabIconService.isMaskedIcon(url)) {
      const replacedUrl = this._tabIconService.getMaskedIcon(url);
      this.iconElement.classList.add('masked');
      this.iconElement.style.mask = `url(${replacedUrl}) center center / 75% no-repeat`;
      this.iconElement.style.backgroundImage = '';
    } else {
      this.iconElement.classList.remove('masked');
      this.iconElement.style.mask = '';
      this.iconElement.style.backgroundImage = `url(${url})`;
    }
  }

  public get tabTitle(): string {
    return this.titleElement.textContent || "";
  }

  public get tabUrl(): string {
    return this.tabButton.title;
  }

  public get tabId(): number {
    return this._tabId;
  }

  public get pinned(): boolean {
    return this.pinButton.classList.contains("pinned");
  }

  public override focus(): void {
    this.tabButton.focus();
  }

  public override click() {
    this.tabButton.click();
  }
}

customElements.define('menulist-tab', MenulistTabElement);
