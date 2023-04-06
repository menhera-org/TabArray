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

import { EventSink } from "weeg-events";

export class ModalMenuElement extends HTMLElement {
  public readonly onActionClicked = new EventSink<string>();

  public constructor(title: string) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/modal-menu.css';
    this.shadowRoot.appendChild(styleSheet);

    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalContent.appendChild(modalTitle);
    modalTitle.textContent = title;

    const modalActions = document.createElement('div');
    modalActions.id = 'modal-actions';
    modalContent.appendChild(modalActions);

    this.shadowRoot.appendChild(modalContent);
  }

  public defineAction(id: string, label: string, isDefault = false) {
    if (!this.shadowRoot) return;
    const modalActions = this.shadowRoot.getElementById('modal-actions') as HTMLDivElement;
    const actionButton = document.createElement('button');
    if (isDefault) {
      actionButton.classList.add('button-default');
    }
    actionButton.textContent = label;
    modalActions.appendChild(actionButton);
    actionButton.addEventListener('click', () => {
      this.remove();
      this.onActionClicked.dispatch(id);
    });
  }
}

customElements.define('modal-menu', ModalMenuElement);
