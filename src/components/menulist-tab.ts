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

import { TabIconService } from '../lib/TabIconService';

import { UserContext } from "../legacy-lib/tabGroups/UserContext";
import { ModalSetTagElement } from './modal-set-tag';

export class MenulistTabElement extends HTMLElement {
  private _tabId = -1;
  private readonly _tabIconService = TabIconService.getInstance();

  public readonly onTabClicked = new EventSink<number>();
  public readonly onPin = new EventSink<number>();
  public readonly onUnpin = new EventSink<number>();
  public readonly onClose = new EventSink<number>();

  public constructor(tab: CompatTab, userContext: UserContext = UserContext.DEFAULT) {
    super();
    this.attachShadow({ mode: "open" });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
    this.setTab(tab);
    this.setUserContext(userContext);
    this.closeButton.title = browser.i18n.getMessage('buttonTabClose');
    // this.privateIconElement.title = browser.i18n.getMessage('buttonTabPrivate');
    this.tabButton.onclick = () => {
      this.onTabClicked.dispatch(this.tabId);
    };
    this.pinButton.onclick = () => {
      if (this.pinned) {
        this.onUnpin.dispatch(this.tabId);
      } else {
        this.onPin.dispatch(this.tabId);
      }
    };
    this.closeButton.onclick = () => {
      this.onClose.dispatch(this.tabId);
    };
    this.tabButton.onauxclick = (event) => {
      if (event.button == 1) {
        this.onClose.dispatch(this.tabId);
      }
    };
    this.setTagButton.onclick = () => {
      document.body.appendChild(new ModalSetTagElement(this.tabId));
    };
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
    tabMain.appendChild(tabPinButton);

    const tabButton = document.createElement('button');
    tabButton.id = 'tab-button';
    tabMain.appendChild(tabButton);

    const tabIcon = document.createElement('span');
    tabIcon.id = 'tab-icon';
    tabButton.appendChild(tabIcon);

    const tabTitle = document.createElement('span');
    tabTitle.id = 'tab-title';
    tabButton.appendChild(tabTitle);

    const tabSetTagButton = document.createElement('button');
    tabSetTagButton.id = 'tab-set-tag-button';
    tabMain.appendChild(tabSetTagButton);

    const tabCloseButton = document.createElement('button');
    tabCloseButton.id = 'tab-close-button';
    tabMain.appendChild(tabCloseButton);
  }

  public setTab(tab: CompatTab) {
    this._tabId = tab.id;

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
    }

    // https://qiita.com/piroor/items/44ccbc2ee918bc88c3ea
    this.addEventListener('contextmenu', () => {
      browser.menus.overrideContext({
        context: 'tab',
        tabId: this._tabId,
      });
    }, { capture: true });
  }

  public setUserContext(userContext: UserContext) {
    if (0 == userContext.id) {
      return;
    }
    this.tabMainElement.style.borderColor = userContext.colorCode;
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
