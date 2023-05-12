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
import { CompatTab } from 'weeg-tabs';

import { TagService } from '../lib/tabGroups/tags/TagService';
import { TagDirectory, TagType } from '../lib/tabGroups/tags/TagDirectory';

const tagService = TagService.getInstance();
const tagDirectory = TagDirectory.getInstance();

export class ModalSetTagElement extends HTMLElement {
  private _tabId: number;

  public readonly onTagAdded = new EventSink<number>();
  public readonly onCancel = new EventSink<void>();

  public constructor(tabId: number) {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    this._tabId = tabId;

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/modal-frame.css';
    this.shadowRoot.appendChild(styleSheet);

    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalContent.appendChild(modalTitle);

    modalTitle.textContent = browser.i18n.getMessage('setTag');

    const select = document.createElement('select');
    select.id = 'tag-select';
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

    tagDirectory.getSnapshot().then((snapshot) => {
      const tagIds = snapshot.getTagIds();
      {
        const option = document.createElement('option');
        option.value = '0';
        option.textContent = browser.i18n.getMessage('noTag');
        select.appendChild(option);
      }
      for (const tagId of tagIds) {
        const tag = snapshot.getTag(tagId) as TagType;
        const name = tag.name;
        const option = document.createElement('option');
        option.value = String(tagId);
        option.textContent = name;
        select.appendChild(option);
      }
      browser.tabs.get(tabId).then(async (browserTab) => {
        const tab = new CompatTab(browserTab);
        const tag = await tagService.getTagForTab(tab);
        const tagId = tag?.tagId ?? 0;
        select.value = tagId.toString();
      });
    });

    cancelButton.addEventListener('click', () => {
      this.onCancel.dispatch();
      this.remove();
    });

    okButton.addEventListener('click', async () => {
      try {
        const browserTab = await browser.tabs.get(this._tabId);
        const tab = new CompatTab(browserTab);
        const targetTagId = parseInt(select.value, 10);
        await tagService.setTagIdForTab(tab, targetTagId == 0 ? null : targetTagId);
        this.onTagAdded.dispatch(targetTagId);
        this.remove();
      } catch (e) {
        console.error(e);
      }
    });
  }
}

customElements.define('modal-set-tag', ModalSetTagElement);
