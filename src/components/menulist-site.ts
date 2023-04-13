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

import { EventSink } from "weeg-events";
import { TabIconService } from '../legacy-lib/modules/TabIconService';

export class MenulistSiteElement extends HTMLElement {
  public readonly onSiteClicked = new EventSink<void>();
  public readonly onSiteCloseClicked = new EventSink<void>();

  private readonly _tabIconService = TabIconService.getInstance();

  public constructor() {
    super();
    this.attachShadow({ mode: "open" });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
  }

  private buildElement() {
    if (!this.shadowRoot) return;
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-site.css';
    this.shadowRoot.appendChild(styleSheet);

    const siteButton = document.createElement('button');
    siteButton.id = 'site-button';
    siteButton.addEventListener('click', () => this.onSiteClicked.dispatch());
    this.shadowRoot.appendChild(siteButton);

    const siteLabelElement = document.createElement('span');
    siteLabelElement.id = 'site-label';
    siteButton.appendChild(siteLabelElement);

    const siteTabElement = document.createElement('span');
    siteTabElement.id = 'site-tab';
    siteButton.appendChild(siteTabElement);

    const siteTabIconElement = document.createElement('span');
    siteTabIconElement.id = 'site-tab-icon';
    siteTabElement.appendChild(siteTabIconElement);

    const siteTabLabelElement = document.createElement('span');
    siteTabLabelElement.id = 'site-tab-label';
    siteTabElement.appendChild(siteTabLabelElement);

    const closeButton = document.createElement('button');
    closeButton.id = 'close-button';
    closeButton.addEventListener('click', () => this.onSiteCloseClicked.dispatch());
    this.shadowRoot.appendChild(closeButton);
  }

  public get tabCount(): number {
    const siteLabelElement = this.shadowRoot?.getElementById('site-label') as HTMLSpanElement;
    return parseInt(siteLabelElement.dataset.tabCount ?? '0', 10);
  }

  public set tabCount(value: number) {
    const siteLabelElement = this.shadowRoot?.getElementById('site-label') as HTMLSpanElement;
    siteLabelElement.dataset.tabCount = value.toString();
  }

  public get domain(): string {
    const siteLabelElement = this.shadowRoot?.getElementById('site-label') as HTMLSpanElement;
    return siteLabelElement.textContent ?? '';
  }

  public set domain(value: string) {
    const siteLabelElement = this.shadowRoot?.getElementById('site-label') as HTMLSpanElement;
    siteLabelElement.textContent = value;
  }

  public get tabIcon(): string {
    const siteTabIconElement = this.shadowRoot?.getElementById('site-tab-icon') as HTMLSpanElement;
    return siteTabIconElement.dataset.iconUrl ?? '';
  }

  public set tabIcon(value: string) {
    const siteTabIconElement = this.shadowRoot?.getElementById('site-tab-icon') as HTMLSpanElement;
    siteTabIconElement.dataset.iconUrl = value;
    if (this._tabIconService.isMaskedIcon(value)) {
      siteTabIconElement.classList.remove('normal-icon');
      siteTabIconElement.style.maskImage = `url(${this._tabIconService.getMaskedIcon(value)})`;
    } else {
      siteTabIconElement.classList.add('normal-icon');
      siteTabIconElement.style.maskImage = '';
      siteTabIconElement.style.backgroundImage = `url(${value})`;
    }
  }

  public get tabLabel(): string {
    const siteTabLabelElement = this.shadowRoot?.getElementById('site-tab-label') as HTMLSpanElement;
    return siteTabLabelElement.textContent ?? '';
  }

  public set tabLabel(value: string) {
    const siteTabLabelElement = this.shadowRoot?.getElementById('site-tab-label') as HTMLSpanElement;
    siteTabLabelElement.textContent = value;
  }

  public override focus() {
    const siteButton = this.shadowRoot?.getElementById('site-button');
    if (siteButton) siteButton.focus();
  }

  public override click() {
    const siteButton = this.shadowRoot?.getElementById('site-button');
    if (siteButton) siteButton.click();
  }
}

customElements.define('menulist-site', MenulistSiteElement);
