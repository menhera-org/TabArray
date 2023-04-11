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
import { PromiseUtils } from 'weeg-utils';
import { CookieStore } from 'weeg-containers';

import { UserContext } from "../frameworks/tabGroups";
import { PopupRenderer } from './PopupRenderer';
import { PopupUtils } from './PopupUtils';
import { ColorPickerElement } from '../components/usercontext-colorpicker';
import { IconPickerElement } from '../components/usercontext-iconpicker';
import { UserContextService } from '../userContexts/UserContextService';
import { PrivateBrowsingService } from '../frameworks/tabs';
import { ModalConfirmElement } from '../components/modal-confirm';
import { ModalMenuElement } from '../components/modal-menu';
import { ContainerEditorElement } from '../components/container-editor';
import { ContextualIdentity, ContainerAttributes } from '../frameworks/tabAttributes';
import { ModalMoveGroupElement } from '../components/modal-move-group';

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
      const buttonArray = [... buttonElement.parentElement?.getElementsByTagName('button') ?? []].filter((button) => !button.disabled);
      const activeElement = this._utils.getActiveElement();
      const index = activeElement instanceof HTMLButtonElement ? buttonArray.indexOf(activeElement) : -1;
      if (ev.key == 'ArrowUp' || ev.key == 'ArrowLeft') {
        return this._utils.arrowUpHandler(activeElement, buttonArray);
      } else if (ev.key == 'ArrowDown' || ev.key == 'ArrowRight') {
        return this._utils.arrowDownHandler(activeElement, buttonArray);
      } else if (ev.key == ' ' && activeElement instanceof HTMLButtonElement) {
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
    const confirmElement = new ModalConfirmElement(message);
    document.body.appendChild(confirmElement);
    return new Promise((resolve) => {
      confirmElement.onCancel.addListener(() => {
        resolve(false);
      });
      confirmElement.onOk.addListener(() => {
        resolve(true);
      });
    });
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
    const editorElement = new ContainerEditorElement();
    document.body.appendChild(editorElement);
    return new Promise((res) => {
      editorElement.onCancel.addListener(() => {
        res(null);
      });
      editorElement.onContainerCreated.addListener((cookieStoreId) => {
        const cookieStore = new CookieStore(cookieStoreId);
        UserContext.get(cookieStore.userContextId).then((userContext) => {
          res(userContext);
        }).catch(() => {
          res(null);
        });
      });
    });
  }

  public async showEditContainerPanelAsync(userContext: UserContext): Promise<UserContext> {
    try {
      const contextualIdentity = await ContextualIdentity.get(userContext.cookieStoreId);
      const containerAttributes = ContainerAttributes.fromContextualIdentity(contextualIdentity);
      const editorElement = new ContainerEditorElement(containerAttributes);
      document.body.appendChild(editorElement);
      return await new Promise((res) => {
        editorElement.onCancel.addListener(() => {
          res(userContext);
        });
        editorElement.onContainerUpdated.addListener((cookieStoreId) => {
          const cookieStore = new CookieStore(cookieStoreId);
          UserContext.get(cookieStore.userContextId).then((userContext) => {
            res(userContext);
          }).catch(() => {
            res(userContext);
          });
        });
      });
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
      location.hash = '';
    });
  }

  public async showContainerOptionsPanelAsync(userContext: UserContext, isPrivate = false): Promise<void> {
    const message = browser.i18n.getMessage('containerOptions', isPrivate ? browser.i18n.getMessage('privateBrowsing') : userContext.name);

    const modalMenuElement = new ModalMenuElement(message);
    document.body.appendChild(modalMenuElement);

    if (!isPrivate && userContext.id != 0) {
      modalMenuElement.defineAction('edit', browser.i18n.getMessage('buttonEditContainer'), false);
      modalMenuElement.defineAction('delete', browser.i18n.getMessage('buttonDeleteContainer'), false);
    }

    modalMenuElement.defineAction('clearCookie', browser.i18n.getMessage('buttonContainerClearCookie'), false);
    modalMenuElement.defineAction('move', browser.i18n.getMessage('moveContainer'), false);
    modalMenuElement.defineAction('done', browser.i18n.getMessage('buttonDone'), true);

    await new Promise<void>((res) => {
      const actionHandler = (action: string) => {
        modalMenuElement.onActionClicked.removeListener(actionHandler);
        switch (action) {
          case 'edit': {
            this.showEditContainerPanelAsync(userContext).catch((e) => {
              console.error(e);
            });
            break;
          }

          case 'clearCookie': {
            this.showContainerClearCookieModal(userContext, isPrivate);
            break;
          }

          case 'delete': {
            this.showDeleteContainerModal(userContext);
            break;
          }

          case 'move': {
            const modalMoveElement = new ModalMoveGroupElement(userContext.cookieStoreId);
            document.body.appendChild(modalMoveElement);
            break;
          }
        }
        res();
      };

      modalMenuElement.onActionClicked.addListener(actionHandler);
    });
  }
}
