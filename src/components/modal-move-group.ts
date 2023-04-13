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
import { EventSink } from 'weeg-events';

import { TabGroupDirectory, SupergroupType } from '../lib/tabGroups/TabGroupDirectory';

const tabGroupDirectory = new TabGroupDirectory();

export class ModalMoveGroupElement extends HTMLElement {
  private _tabGroupId: string;

  public readonly onGroupMoved = new EventSink<string>();
  public readonly onCancel = new EventSink<void>();

  public constructor(tabGroupId: string) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    this._tabGroupId = tabGroupId;

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/modal-frame.css';
    this.shadowRoot.appendChild(styleSheet);

    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalContent.appendChild(modalTitle);

    modalTitle.textContent = browser.i18n.getMessage('moveContainer');

    const select = document.createElement('select');
    select.id = 'group-select';
    modalContent.appendChild(select);

    const modalActions = document.createElement('div');
    modalActions.id = 'modal-actions';
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-button';
    cancelButton.textContent = browser.i18n.getMessage('buttonCancel');
    modalActions.appendChild(cancelButton);
    const okButton = document.createElement('button');
    okButton.id = 'ok-button';
    okButton.textContent = browser.i18n.getMessage('buttonMove');
    modalActions.appendChild(okButton);
    modalContent.appendChild(modalActions);

    this.shadowRoot.appendChild(modalContent);

    tabGroupDirectory.getSnapshot().then((snapshot) => {
      const value = snapshot.value;
      for (const targetTabGroupId in value) {
        if (targetTabGroupId === this._tabGroupId) {
          continue;
        }
        if (snapshot.hasChildTabGroupId(this._tabGroupId, targetTabGroupId)) {
          continue;
        }
        const supergroup = value[targetTabGroupId] as SupergroupType;
        const option = document.createElement('option');
        option.value = targetTabGroupId;
        const name = supergroup.supergroupId == 0 ? browser.i18n.getMessage('rootGroup') : supergroup.name;
        option.textContent = name;
        select.appendChild(option);
      }
    });

    cancelButton.addEventListener('click', () => {
      this.onCancel.dispatch();
      this.remove();
    });

    okButton.addEventListener('click', async () => {
      const targetTabGroupId = select.value;
      await tabGroupDirectory.moveTabGroupToSupergroup(this._tabGroupId, targetTabGroupId);
      this.onGroupMoved.dispatch(targetTabGroupId);
      this.remove();
    });
  }
}

customElements.define('modal-move-group', ModalMoveGroupElement);
