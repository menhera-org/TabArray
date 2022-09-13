// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
import { UserContext } from "../frameworks/tabGroups";
import { PopupRenderer } from './PopupRenderer';
import { PopupUtils } from './PopupUtils';
import { PromiseUtils } from '../frameworks/utils';
import { ColorPickerElement } from '../components/usercontext-colorpicker';
import { IconPickerElement } from '../components/usercontext-iconpicker';
import { UserContextService } from '../userContexts/UserContextService';

type NewContainerPanelResult = {
  name: string;
  icon: string;
  color: string;
};

export class PopupModalRenderer {
  private readonly _popupRenderer: PopupRenderer;
  private readonly _utils: PopupUtils;
  private readonly _userContextService = UserContextService.getInstance();

  constructor(popupRenderer: PopupRenderer) {
    this._popupRenderer = popupRenderer;
    this._utils = new PopupUtils();
  }

  private async showModal(message: string, MessageElement: HTMLElement, okButton: HTMLButtonElement, cancelButton: HTMLButtonElement): Promise<boolean> {
    MessageElement.textContent = message;
    const promise = PromiseUtils.createPromise<boolean>();
    const handler = (result: boolean) => {
      cleanUp();
      promise.resolve(result);
    };
    const cancelHandler = () => {
      handler(false);
    };
    const okHandler = () => {
      handler(true);
    };
    const catchEvent = (ev: Event) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key == 'Enter') {
        catchEvent(ev);
        okHandler();
      }
      if (ev.key == 'Escape') {
        catchEvent(ev);
        cancelHandler();
      }
    };
    const cleanUp = () => {
      cancelButton.removeEventListener('click', cancelHandler);
      okButton.removeEventListener('click', okHandler);
      document.removeEventListener('keydown', keyHandler);
    };
    cancelButton.addEventListener('click', cancelHandler);
    okButton.addEventListener('click', okHandler);
    document.addEventListener('keydown', keyHandler, true);
    return await promise.promise;
  }

  public async confirmAsync(message: string): Promise<boolean> {
    const confirmMessageElement = this._utils.queryElementNonNull<HTMLElement>('#confirm-message');
    const cancelButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-cancel-button');
    const okButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-ok-button');
    const previousHash = location.hash;
    location.hash = '#confirm';
    const result = await this.showModal(message, confirmMessageElement, okButton, cancelButton);
    location.hash = previousHash;
    return result;
  }

  private async showContainerManipulationPanelAsync(dialogTitle: string, userContext?: UserContext): Promise<NewContainerPanelResult> {
    const message = dialogTitle;
    const messageElement = this._utils.queryElementNonNull<HTMLElement>('#new-container .modal-title');
    const cancelButton = this._utils.queryElementNonNull<HTMLButtonElement>('#new-container-cancel-button');
    const okButton = this._utils.queryElementNonNull<HTMLButtonElement>('#new-container-ok-button');
    const nameElement = this._utils.queryElementNonNull<HTMLInputElement>('#new-container-name');
    const iconElement = this._utils.queryElementNonNull<IconPickerElement>('#new-container-icon');
    const colorElement = this._utils.queryElementNonNull<ColorPickerElement>('#new-container-color');
    const previousHash = location.hash;
    nameElement.value = '';
    iconElement.value = 'fingerprint';
    colorElement.value = 'blue';
    if (userContext) {
      nameElement.value = userContext.name;
      iconElement.value = userContext.icon;
      colorElement.value = userContext.color;
    }
    location.hash = '#new-container';
    const result = await this.showModal(message, messageElement, okButton, cancelButton);
    location.hash = previousHash;
    if (!result) {
      throw new Error('User cancelled');
    }
    const name = nameElement.value;
    const icon = iconElement.value;
    const color = colorElement.value;
    return { name, icon, color };
  }

  public async showNewContainerPanelAsync(): Promise<UserContext | null> {
    try {
      const { name, icon, color } = await this.showContainerManipulationPanelAsync(browser.i18n.getMessage('newContainerDialogTitle'));
      return await this._userContextService.create(name, color, icon);
    } catch (e) {
      return null;
    }
  }

  public async showEditContainerPanelAsync(userContext: UserContext): Promise<UserContext> {
    try {
      const { name, icon, color } = await this.showContainerManipulationPanelAsync(browser.i18n.getMessage('editContainerDialogTitle'), userContext);
      return await this._userContextService.updateProperties(userContext, name, color, icon);
    } catch (e) {
      return userContext;
    }
  }
}
