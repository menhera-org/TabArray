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

export class ModalFrameElement extends HTMLElement {
  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/modal-frame.css';
    this.shadowRoot.appendChild(styleSheet);

    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    this.shadowRoot.appendChild(modalContent);

    const slot = document.createElement('slot');
    modalContent.appendChild(slot);

    const modalActions = document.createElement('div');
    modalActions.id = 'modal-actions';

    const doneButton = document.createElement('button');
    doneButton.id = 'done-button';
    doneButton.textContent = browser.i18n.getMessage('buttonDone');
    doneButton.classList.add('button-default');
    modalActions.appendChild(doneButton);
    modalContent.appendChild(modalActions);

    doneButton.addEventListener('click', () => {
      this.remove();
    });
  }
}

customElements.define('modal-frame', ModalFrameElement);
