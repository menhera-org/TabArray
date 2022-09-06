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

customElements.define('panorama-tab', class PanoramaTabElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
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
    tabPreview.append(tabPreviewImg);
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
    tabIconElement.addEventListener('error', ev => {
      ev.target.classList.add('img-error');
      ev.target.src = '/img/transparent.png';
    });
    tabInfo.append(tabIconElement);
    const tabTitleElement = document.createElement('div');
    tabTitleElement.id = 'tab-title';
    tabInfo.append(tabTitleElement);
  }

  get tabTitle() {
    return this.shadowRoot.querySelector('#tab-title').textContent;
  }

  set tabTitle(value) {
    this.shadowRoot.querySelector('#tab-title').textContent = value;
  }

  get iconUrl() {
    return this.shadowRoot.querySelector('#tab-icon').src;
  }

  set iconUrl(value) {
    this.shadowRoot.querySelector('#tab-icon').src = value;
  }

  get previewUrl() {
    return this.shadowRoot.querySelector('#tab-preview-img').src;
  }

  set previewUrl(value) {
    this.shadowRoot.querySelector('#tab-preview-img').src = value;
  }
});
