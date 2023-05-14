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
import { ContextualIdentity, CookieStore } from 'weeg-containers';

import { SupergroupService } from '../lib/tabGroups/SupergroupService';
import { ContainerCreatorService } from '../lib/tabGroups/ContainerCreatorService';
import { DisplayedContainerService } from '../lib/tabGroups/DisplayedContainerService';
import { CookieCopyService } from '../lib/cookies/CookieCopyService';

import { ColorPickerElement } from './container-color-picker';
import { IconPickerElement } from './container-icon-picker';

export type EditorMode = 'create' | 'edit';

export class ContainerEditorElement extends HTMLElement {
  private _mode: EditorMode;
  private _contextualIdentity: ContextualIdentity | undefined;
  private readonly _supergroupService = SupergroupService.getInstance();
  private readonly _containerCreatorService = ContainerCreatorService.getInstance<ContainerCreatorService>();
  private readonly _displayedContainerService = DisplayedContainerService.getInstance();
  private readonly _cookieCopyService = CookieCopyService.getInstance();

  public readonly onContainerCreated = new EventSink<string>();
  public readonly onContainerUpdated = new EventSink<string>();
  public readonly onCancel = new EventSink<void>();

  public constructor(contextualIdentity?: ContextualIdentity, parentTabGroupId?: string) {
    super();
    this._contextualIdentity = contextualIdentity;
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root is null');
    }

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = '/css/components/container-editor.css';
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
    input.id = 'container-name';
    input.classList.add('input-box-input');
    inputBox.appendChild(input);
    modalContent.appendChild(inputBox);
    const iconPicker = new IconPickerElement();
    iconPicker.id = 'icon-picker';
    modalContent.appendChild(iconPicker);
    const colorPicker = new ColorPickerElement();
    colorPicker.id = 'color-picker';
    modalContent.appendChild(colorPicker);

    const cookieCopy = document.createElement('p');
    const cookieCopyCheckbox = document.createElement('input');
    cookieCopyCheckbox.type = 'checkbox';
    cookieCopyCheckbox.id = 'cookie-copy-checkbox';
    cookieCopyCheckbox.checked = false;
    cookieCopy.appendChild(cookieCopyCheckbox);
    const cookieCopyLabel = document.createElement('label');
    cookieCopyLabel.textContent = browser.i18n.getMessage('copyCookiesFrom');
    cookieCopyLabel.htmlFor = 'cookie-copy-checkbox';
    cookieCopy.appendChild(cookieCopyLabel);
    const cookieCopySelect = document.createElement('select');
    cookieCopySelect.id = 'cookie-copy-select';
    cookieCopySelect.disabled = true;
    cookieCopy.appendChild(cookieCopySelect);
    modalContent.appendChild(cookieCopy);

    this._displayedContainerService.getDisplayedContainers().then((containers) => {
      containers.forEach((container) => {
        const option = document.createElement('option');
        option.value = container.cookieStore.id;
        option.textContent = container.name;
        if (container.cookieStore.id == CookieStore.DEFAULT.id) {
          option.selected = true;
        }
        cookieCopySelect.appendChild(option);
      });
    });

    cookieCopyCheckbox.addEventListener('change', () => {
      cookieCopySelect.disabled = !cookieCopyCheckbox.checked;
    });

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

    if (contextualIdentity) {
      this._mode = 'edit';
      modalTitle.textContent = browser.i18n.getMessage('editContainerDialogTitle');
      input.value = contextualIdentity.name;
      iconPicker.value = contextualIdentity.icon;
      colorPicker.value = contextualIdentity.color;
      cookieCopy.hidden = true;
    } else {
      this._mode = 'create';
      modalTitle.textContent = browser.i18n.getMessage('newContainerDialogTitle');
    }

    this.shadowRoot.appendChild(modalContent);

    cancelButton.addEventListener('click', () => {
      this.onCancel.dispatch();
      this.remove();
    });

    const containerCreated = (cookieStoreId: string) => {
      const whetherToCopyCookies = cookieCopyCheckbox.checked;
      if (whetherToCopyCookies) {
        const sourceCookieStoreId = cookieCopySelect.value;
        this._cookieCopyService.copyAllCookiesToContainer(sourceCookieStoreId, cookieStoreId).then(() => {
          this.onContainerCreated.dispatch(cookieStoreId);
        }).catch((e) => {
          console.error(e);
        });
      } else {
        this.onContainerCreated.dispatch(cookieStoreId);
      }
    };

    okButton.addEventListener('click', async () => {
      const name = input.value.trim().replace(/^\s*|\s*$/gu, '');
      if ('' == name) return;
      const icon = iconPicker.value;
      const color = colorPicker.value;
      if (this._mode === 'create') {
        if (parentTabGroupId) {
          const contextualIdentity = await this._supergroupService.createChildContainer(parentTabGroupId, {
            name,
            icon,
            color,
          });
          containerCreated(contextualIdentity.cookieStore.id);
        } else {
          const cookieStoreId = await this._containerCreatorService.create(
            name,
            color,
            icon,
          ) as string;
          containerCreated(cookieStoreId);
        }
      } else if (this._mode === 'edit') {
        if (!this._contextualIdentity) {
          throw new Error('Container attributes is null');
        }
        const cookieStoreId = await this._containerCreatorService.update(
          this._contextualIdentity.cookieStore.id,
          name,
          color,
          icon,
        );
        this.onContainerUpdated.dispatch(cookieStoreId);
      }
      this.remove();
    });
  }
}

customElements.define('container-editor', ContainerEditorElement);
