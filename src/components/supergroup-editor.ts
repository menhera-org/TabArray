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

import browser from 'webextension-polyfill';
import { EventSink } from 'weeg-events';

import { TabGroupDirectory, SupergroupType } from '../lib/tabGroups/TabGroupDirectory';
import { TabGroupAttributes } from '../lib/tabGroups/TabGroupAttributes';

export type EditorMode = 'create' | 'edit';

const tabGroupDirectory = new TabGroupDirectory();

export class SupergroupEditorElement extends HTMLElement {
  private _mode: EditorMode;
  private _supergroup: SupergroupType | undefined;
  private _tabGroupId: string | undefined;

  public readonly onSupergroupCreated = new EventSink<string>();
  public readonly onSupergroupUpdated = new EventSink<string>();
  public readonly onCancel = new EventSink<void>();

  public constructor(supergroup?: SupergroupType) {
    super();
    this._supergroup = supergroup;
    if (supergroup) {
      this._tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
    }

    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/components/supergroup-editor.css';
    this.shadowRoot.appendChild(styleSheet);

    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalContent.appendChild(modalTitle);
    const inputBox = document.createElement('div');
    inputBox.classList.add('input-box');
    const inputLabel = document.createElement('label');
    inputLabel.textContent = browser.i18n.getMessage('newContainerNameLabel');
    inputBox.appendChild(inputLabel);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'group-name';
    input.classList.add('input-box-input');
    inputBox.appendChild(input);
    modalContent.appendChild(inputBox);
    const modalActions = document.createElement('div');
    modalActions.id = 'modal-actions';
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-button';
    cancelButton.textContent = browser.i18n.getMessage('buttonCancel');
    modalActions.appendChild(cancelButton);
    const okButton = document.createElement('button');
    okButton.id = 'ok-button';
    okButton.textContent = browser.i18n.getMessage('buttonOk');
    modalActions.appendChild(okButton);
    modalContent.appendChild(modalActions);

    if (supergroup) {
      this._mode = 'edit';
      modalTitle.textContent = browser.i18n.getMessage('editGroupDialogTitle');
      input.value = supergroup.name;
    } else {
      this._mode = 'create';
      modalTitle.textContent = browser.i18n.getMessage('newGroupDialogTitle');
    }

    this.shadowRoot.appendChild(modalContent);

    cancelButton.addEventListener('click', () => {
      this.onCancel.dispatch();
      this.remove();
    });

    okButton.addEventListener('click', async () => {
      const name = input.value.trim().replace(/^\s*|\s*$/gu, '');
      if ('' == name) return;
      if (this._mode === 'create') {
        const tabGroupId = await tabGroupDirectory.createSupergroup(name);
        this.onSupergroupCreated.dispatch(tabGroupId);
      } else if (this._mode === 'edit') {
        if (!this._supergroup || !this._tabGroupId) {
          throw new Error('Supergroup is null');
        }
        await tabGroupDirectory.renameSupergroup(this._tabGroupId, name);
        this.onSupergroupUpdated.dispatch(this._tabGroupId);
      }
      this.remove();
    });
  }
}

customElements.define('supergroup-editor', SupergroupEditorElement);
