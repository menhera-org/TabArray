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

import { TagEditorElement } from './tag-editor';

const tagDirectory = new TagDirectory();

export class MenulistTagElement extends HTMLElement {
  public readonly onTagButtonClicked = new EventSink<void>();
  private readonly tag: TagType;

  public constructor(tag: TagType) {
    super();
    this.tag = tag;
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error("Shadow root is null");
    }
    this.buildElement();
    this.tagEditButton.title = browser.i18n.getMessage('buttonEditTag');
    this.tagDeleteButton.title = browser.i18n.getMessage('buttonDeleteTag');
    this.registerEventListeners();
    this.groupName = tag.name;
  }

  private buildElement() {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/menulist-tag.css';
    this.shadowRoot?.appendChild(styleSheet);

    const groupElement = document.createElement('div');
    groupElement.id = 'group';
    this.shadowRoot?.appendChild(groupElement);

    const groupHeaderElement = document.createElement('div');
    groupHeaderElement.id = 'group-header';
    groupElement.appendChild(groupHeaderElement);

    const groupButton = document.createElement('button');
    groupButton.id = 'group-button';
    groupHeaderElement.appendChild(groupButton);

    const groupIconElement = document.createElement('span');
    groupIconElement.id = 'group-icon';
    groupButton.appendChild(groupIconElement);

    const groupNameElement = document.createElement('span');
    groupNameElement.id = 'group-name';
    groupButton.appendChild(groupNameElement);

    const tagDeleteButton = document.createElement('button');
    tagDeleteButton.id = 'tag-delete-button';
    groupHeaderElement.appendChild(tagDeleteButton);

    const tagEditButton = document.createElement('button');
    tagEditButton.id = 'tag-edit-button';
    groupHeaderElement.appendChild(tagEditButton);

    const groupTabsElement = document.createElement('div');
    groupTabsElement.id = 'group-tabs';
    groupElement.appendChild(groupTabsElement);

    const slotElement = document.createElement('slot');
    groupTabsElement.appendChild(slotElement);
  }

  private registerEventListeners() {
    this.tagEditButton.onclick = () => {
      document.body.appendChild(new TagEditorElement(this.tag));
    };
    this.tagDeleteButton.onclick = () => {
      tagDirectory.deleteTag(this.tag.tagId).catch((e) => {
        console.error(e);
      });
    };
    this.groupButton.onclick = () => {
      this.onTagButtonClicked.dispatch();
    };
  }

  private get tagNameElement(): HTMLSpanElement {
    return this.shadowRoot?.querySelector('#group-name') as HTMLSpanElement;
  }

  private get tagDeleteButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#tag-delete-button') as HTMLButtonElement;
  }

  private get tagEditButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#tag-edit-button') as HTMLButtonElement;
  }

  private get groupButton(): HTMLButtonElement {
    return this.shadowRoot?.querySelector('#group-button') as HTMLButtonElement;
  }

  private get groupName(): string {
    return this.tagNameElement.textContent || '';
  }

  private set groupName(groupName: string) {
    this.tagNameElement.textContent = groupName;
  }
}

customElements.define('menulist-tag', MenulistTagElement);
