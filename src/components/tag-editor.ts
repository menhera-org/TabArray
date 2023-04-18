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

import { TagDirectory, TagType } from '../lib/tabGroups/TagDirectory';

export type EditorMode = 'create' | 'edit';

const tagDirectory = new TagDirectory();

export class TagEditorElement extends HTMLElement {
  private _mode: EditorMode;
  private _tag: TagType | undefined;

  public readonly onTagCreated = new EventSink<number>();
  public readonly onTagUpdated = new EventSink<number>();
  public readonly onCancel = new EventSink<void>();

  public constructor(tag?: TagType) {
    super();
    this._tag = tag;

    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/supergroup-editor.css';
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

    if (tag) {
      this._mode = 'edit';
      modalTitle.textContent = browser.i18n.getMessage('editTagDialogTitle');
      input.value = tag.name;
    } else {
      this._mode = 'create';
      modalTitle.textContent = browser.i18n.getMessage('newTagDialogTitle');
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
        const tag = await tagDirectory.createTag(name);
        this.onTagCreated.dispatch(tag.tagId);
      } else if (this._mode === 'edit') {
        if (!this._tag) {
          throw new Error('Supergroup is null');
        }
        await tagDirectory.renameTag(this._tag.tagId, name);
        this.onTagUpdated.dispatch(this._tag.tagId);
      }
      this.remove();
    });
  }
}

customElements.define('tag-editor', TagEditorElement);
