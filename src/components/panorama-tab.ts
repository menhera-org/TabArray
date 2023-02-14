// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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

export class PanoramaTabElement extends HTMLElement {
  private _tabIconElement: HTMLImageElement;
  private _tabTitleElement: HTMLDivElement;
  private _tabPreviewImg: HTMLImageElement;

  constructor() {
    super();
    this.draggable = true;
    this.attachShadow({mode: 'open'});
    if (!this.shadowRoot) {
      throw new Error('shadowRoot is null');
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/components/panorama-tab.css';
    this.shadowRoot.append(css);
    const tabPreview = document.createElement('button');
    tabPreview.id = 'tab-preview';
    this.shadowRoot.append(tabPreview);
    tabPreview.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.dispatchEvent(new Event('button-tab-click'));
    });
    const tabPreviewImg = document.createElement('img');
    tabPreviewImg.id = 'tab-preview-img';
    tabPreviewImg.draggable = false;
    // tabPreview.draggable = false;
    tabPreview.append(tabPreviewImg);
    this._tabPreviewImg = tabPreviewImg;
    const controls = document.createElement('div');
    controls.id = 'controls';
    this.shadowRoot.append(controls);
    const closeButton = document.createElement('button');
    closeButton.id = 'button-close';
    closeButton.textContent = browser.i18n.getMessage('buttonTabClose');
    closeButton.title = browser.i18n.getMessage('buttonTabClose');
    closeButton.addEventListener('click', (ev) => {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      this.dispatchEvent(new Event('button-tab-close'));
    });
    controls.append(closeButton);
    const tabInfo = document.createElement('div');
    tabInfo.id = 'tab-info';
    this.shadowRoot.append(tabInfo);
    tabInfo.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.dispatchEvent(new Event('button-tab-click'));
    });
    const tabIconElement = document.createElement('img');
    tabIconElement.id = 'tab-icon';
    tabIconElement.src = '/img/transparent.png';
    tabIconElement.addEventListener('error', () => {
      tabIconElement.classList.add('img-error');
      tabIconElement.src = '/img/transparent.png';
    });
    this._tabIconElement = tabIconElement;
    tabInfo.append(tabIconElement);
    const tabTitleElement = document.createElement('div');
    tabTitleElement.id = 'tab-title';
    this._tabTitleElement = tabTitleElement;
    tabInfo.append(tabTitleElement);
  }

  get tabTitle() {
    return this._tabTitleElement.textContent;
  }

  set tabTitle(value) {
    this._tabTitleElement.textContent = value;
  }

  get iconUrl() {
    return this._tabIconElement.src;
  }

  set iconUrl(value) {
    this._tabIconElement.src = value;
  }

  get previewUrl() {
    return this._tabPreviewImg.src;
  }

  set previewUrl(value) {
    this._tabPreviewImg.src = value;
  }
}

customElements.define('panorama-tab', PanoramaTabElement);
