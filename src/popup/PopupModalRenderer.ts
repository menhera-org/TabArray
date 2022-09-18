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
import { PrivateBrowsingService } from '../frameworks/tabs';

type NewContainerPanelResult = {
  name: string;
  icon: string;
  color: string;
};

type KeyHandlers = {
  okHandler: (event?: Event) => void;
  cancelHandler: (event?: Event) => void;
  keyHandler?: (event: KeyboardEvent) => boolean;
};

export class PopupModalRenderer {
  private readonly _popupRenderer: PopupRenderer;
  private readonly _utils: PopupUtils;
  private readonly _userContextService = UserContextService.getInstance();
  private readonly _keyHandlersStack = new Array<KeyHandlers>();
  private _privateBrowsingService = PrivateBrowsingService.getInstance();

  constructor(popupRenderer: PopupRenderer) {
    this._popupRenderer = popupRenderer;
    this._utils = new PopupUtils();

    const catchEvent = (ev: Event) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    const keyHandler = (ev: KeyboardEvent) => {
      const handlers = this._keyHandlersStack[this._keyHandlersStack.length - 1];
      if (!handlers) {
        return;
      }
      if (ev.key == 'Enter') {
        catchEvent(ev);
        handlers.okHandler(ev);
      } else if (ev.key == 'Escape') {
        catchEvent(ev);
        handlers.cancelHandler(ev);
      } else if (handlers.keyHandler) {
        if (handlers.keyHandler(ev)) {
          catchEvent(ev);
        }
      }
    };

    document.addEventListener('keydown', keyHandler, true);
  }

  public pushKeyHandlers(okHandler: (event?: Event) => void, cancelHandler: (event?: Event) => void, keyHandler?: (event: KeyboardEvent) => boolean) {
    this._keyHandlersStack.push({ okHandler, cancelHandler, keyHandler });
  }

  public popKeyHandlers() {
    this._keyHandlersStack.pop();
  }

  private defineKeyHandlerForModal(buttonElement: HTMLButtonElement) {
    return (ev: KeyboardEvent) => {
      const buttonArray = [... buttonElement.parentElement?.getElementsByTagName('button') ?? []];
      const activeElement = this._utils.getActiveElement();
      const index = activeElement instanceof HTMLButtonElement ? buttonArray.indexOf(activeElement) : -1;
      if (ev.key == 'ArrowUp' || ev.key == 'ArrowLeft') {
        if (index <= 0) {
          buttonArray[buttonArray.length - 1]?.focus();
        } else {
          buttonArray[index - 1]?.focus();
        }
        return true;
      } else if (ev.key == 'ArrowDown' || ev.key == 'ArrowRight') {
        if (index < 0 || index >= buttonArray.length - 1) {
          buttonArray[0]?.focus();
        } else {
          buttonArray[index + 1]?.focus();
        }
        return true;
      } else if (ev.key == ' ') {
        buttonArray[index]?.click();
        return true;
      }

      return false;
    };
  }

  private async showModal(message: string, MessageElement: HTMLElement, okButton: HTMLButtonElement, cancelButton: HTMLButtonElement, hash: string): Promise<boolean> {
    const previousHash = location.hash;
    const activeElement = this._utils.getActiveElement();
    location.hash = hash;
    MessageElement.textContent = message;
    const promise = PromiseUtils.createPromise<boolean>();
    const handler = (result: boolean) => {
      cleanUp();
      promise.resolve(result);
    };
    const cancelHandler = () => handler(false);
    const okHandler = (ev?: Event) => {
      const activeElement = this._utils.getActiveElement();
      if (ev instanceof KeyboardEvent && activeElement) {
        activeElement.click();
      } else {
        handler(true);
      }
    };
    const keyHandler = this.defineKeyHandlerForModal(okButton);
    const cleanUp = () => {
      cancelButton.removeEventListener('click', cancelHandler);
      if (okButton != cancelButton) {
        okButton.removeEventListener('click', okHandler);
      }
      this.popKeyHandlers();
    };
    cancelButton.addEventListener('click', cancelHandler);
    if (okButton != cancelButton) {
      okButton.addEventListener('click', okHandler);
    }
    this.pushKeyHandlers(okHandler, cancelHandler, keyHandler);
    cancelButton.focus();
    const result = await promise.promise;
    location.hash = previousHash;
    if (activeElement) {
      activeElement.focus();
    }
    return result;
  }

  public async confirmAsync(message: string): Promise<boolean> {
    const confirmMessageElement = this._utils.queryElementNonNull<HTMLElement>('#confirm-message');
    const cancelButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-cancel-button');
    const okButton = this._utils.queryElementNonNull<HTMLButtonElement>('#confirm-ok-button');
    const result = await this.showModal(message, confirmMessageElement, okButton, cancelButton, '#confirm');
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
    nameElement.value = '';
    iconElement.value = 'fingerprint';
    colorElement.value = 'blue';
    if (userContext) {
      nameElement.value = userContext.name;
      iconElement.value = userContext.icon;
      colorElement.value = userContext.color;
    }
    const result = await this.showModal(message, messageElement, okButton, cancelButton, '#new-container');
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
      const updateUserContext = await this._userContextService.updateProperties(userContext, name, color, icon);
      console.log('Container updated', updateUserContext);
      return updateUserContext;
    } catch (e) {
      return userContext;
    }
  }

  public showContainerClearCookieModal(userContext: UserContext, isPrivate = false): void {
    if (isPrivate) {
      this.confirmAsync(browser.i18n.getMessage('confirmPrivateBrowsingClearCookie')).then((result) => {
        if (!result) return;
        this._privateBrowsingService.clearBrowsingData().then(() => {
          console.log('Removed browsing data for private browsing');
        }).catch((e) => {
          console.error(e);
        });
      });
      return;
    }
    this.confirmAsync(browser.i18n.getMessage('confirmContainerClearCookie', userContext.name)).then((result) => {
      if (!result) return;
      userContext.removeBrowsingData().then(() => {
        console.log('Removed browsing data for container', userContext);
      }).catch((e) => {
        console.error(e);
      });
    });
  }

  public showDeleteContainerModal(userContext: UserContext): void {
    this.confirmAsync(browser.i18n.getMessage('confirmContainerDelete', userContext.name)).then((result) => {
      if (!result) return;
      userContext.remove().catch((e) => {
        console.error(e);
      });
    });
  }

  public async showContainerOptionsPanelAsync(userContext: UserContext, isPrivate = false): Promise<void> {
    const messageElement = this._utils.queryElementNonNull<HTMLElement>('#container-menu .modal-title');
    const doneButton = this._utils.queryElementNonNull<HTMLButtonElement>('#container-menu-done-button');
    const message = browser.i18n.getMessage('containerOptions', isPrivate ? browser.i18n.getMessage('privateBrowsing') : userContext.name);

    const editButton = this._utils.queryElementNonNull<HTMLButtonElement>('#container-menu-edit-button');
    const clearCookie = this._utils.queryElementNonNull<HTMLButtonElement>('#container-menu-clear-cookie-button');
    const deleteButton = this._utils.queryElementNonNull<HTMLButtonElement>('#container-menu-delete-button');

    if (isPrivate || userContext.id == 0) {
      editButton.disabled = true;
      deleteButton.disabled = true;
    } else {
      editButton.disabled = false;
      deleteButton.disabled = false;
    }

    const editHandler = async () => {
      await this.showEditContainerPanelAsync(userContext);
    };

    const clearCookieHandler = () => {
      this.showContainerClearCookieModal(userContext, isPrivate);
    };

    const deleteHandler = () => {
      this.showDeleteContainerModal(userContext);
    };

    editButton.addEventListener('click', editHandler);
    clearCookie.addEventListener('click', clearCookieHandler);
    deleteButton.addEventListener('click', deleteHandler);

    await this.showModal(message, messageElement, doneButton, doneButton, '#container-menu');

    editButton.removeEventListener('click', editHandler);
    clearCookie.removeEventListener('click', clearCookieHandler);
    deleteButton.removeEventListener('click', deleteHandler);
  }
}
