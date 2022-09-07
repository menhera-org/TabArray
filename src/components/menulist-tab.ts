// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=&2 sw=2 et ai :

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
import { Tab } from "../frameworks/tabs";
import { EventSink } from '../frameworks/utils';

export class MenulistTabElement extends HTMLElement {
  private static readonly TEMPLATE = `
    <link rel='stylesheet' href='/components/menulist-tab.css'/>
    <div id='tab-menu'>
      <img id='tab-private-icon' src='/img/private-browsing-icon.svg'/>
      <div id='tab-main'>
        <button id='tab-pin-button'></button>
        <button id='tab-button'>
          <img id='tab-icon'/>
          <span id='tab-title'></span>
        </button>
        <button id='tab-close-button'></button>
      </div>
    </div>
  `;

  private _tabId = -1;
  public readonly onTabClicked = new EventSink<number>();
  public readonly onPin = new EventSink<number>();
  public readonly onUnpin = new EventSink<number>();
  public readonly onClose = new EventSink<number>();

  public constructor(tab: Tab, userContext: UserContext = UserContext.DEFAULT) {
    super();
    this.attachShadow({ mode: "open" });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.shadowRoot.innerHTML = MenulistTabElement.TEMPLATE;
    this.setTab(tab);
    this.setUserContext(userContext);
    this.closeButton.title = browser.i18n.getMessage('buttonTabClose');
    // this.privateIconElement.title = browser.i18n.getMessage('buttonTabPrivate');
    this.iconElement.onerror = () => {
      this.iconElement.src = '/img/transparent.png';
    };
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
  }

  public setTab(tab: Tab) {
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
    if (tab.isPrivate()) {
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
  }

  private setUserContext(userContext: UserContext) {
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

  private get iconElement(): HTMLImageElement {
    const icon = this.getShadowElement("tab-icon");
    return icon as HTMLImageElement;
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
    return this.iconElement.src;
  }

  public set iconUrl(url: string) {
    this.iconElement.src = url;
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
}

customElements.define('menulist-tab', MenulistTabElement);
