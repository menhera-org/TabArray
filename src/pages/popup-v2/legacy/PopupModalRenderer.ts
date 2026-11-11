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
import { CookieStore, DisplayedContainer, ContextualIdentity } from 'weeg-containers';

import { ContextualIdentityService } from '../../../lib/tabGroups/ContextualIdentityService';
import { TabGroupService } from '../../../lib/tabGroups/TabGroupService';
import { DisplayedContainerService } from '../../../lib/tabGroups/DisplayedContainerService';
import { CompatConsole } from '../../../lib/console/CompatConsole';
import { SupergroupType, TabGroupDirectory } from '../../../lib/tabGroups/TabGroupDirectory';
import { TabGroupAttributes } from '../../../lib/tabGroups/TabGroupAttributes';
import { SupergroupService } from '../../../lib/tabGroups/SupergroupService';

import { ModalConfirmElement } from '../../../components/modal-confirm';
import { ModalMenuElement } from '../../../components/modal-menu';
import { ContainerEditorElement } from '../../../components/container-editor';
import { ModalMoveGroupElement } from '../../../components/modal-move-group';
import { SupergroupEditorElement } from '../../../components/supergroup-editor';

type KeyHandlers = {
  okHandler: (event?: Event) => void;
  cancelHandler: (event?: Event) => void;
  keyHandler?: (event: KeyboardEvent) => boolean;
};

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export class PopupModalRenderer {
  private readonly _keyHandlersStack: KeyHandlers[] = [];
  private readonly _contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly _contextualIdentityFactory = this._contextualIdentityService.getFactory();
  private readonly _tabGroupService = TabGroupService.getInstance();
  private readonly _displayedContainerService = DisplayedContainerService.getInstance();

  constructor() {
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

  public pushKeyHandlers(
    okHandler: (event?: Event) => void,
    cancelHandler: (event?: Event) => void,
    keyHandler?: (event: KeyboardEvent) => boolean
  ) {
    this._keyHandlersStack.push({ okHandler, cancelHandler, keyHandler });
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

  public async showNewContainerPanelAsync(): Promise<ContextualIdentity | null> {
    const editorElement = new ContainerEditorElement();
    document.body.appendChild(editorElement);
    return new Promise((res) => {
      editorElement.onCancel.addListener(() => {
        res(null);
      });
      editorElement.onContainerCreated.addListener((cookieStoreId) => {
        this._contextualIdentityFactory
          .get(cookieStoreId)
          .then((contextualIdentity) => {
            res(contextualIdentity);
          })
          .catch(() => {
            res(null);
          });
      });
    });
  }

  public async showEditContainerPanelAsync(contextualIdentity: ContextualIdentity): Promise<ContextualIdentity> {
    try {
      const editorElement = new ContainerEditorElement(contextualIdentity);
      document.body.appendChild(editorElement);
      return await new Promise((res) => {
        editorElement.onCancel.addListener(() => {
          res(contextualIdentity);
        });
        editorElement.onContainerUpdated.addListener((cookieStoreId) => {
          this._contextualIdentityFactory
            .get(cookieStoreId)
            .then((contextualIdentity) => {
              res(contextualIdentity);
            })
            .catch(() => {
              res(contextualIdentity);
            });
        });
      });
    } catch (_e) {
      return contextualIdentity;
    }
  }

  public showContainerClearCookieModal(displayedContainer: DisplayedContainer, isPrivate = false): void {
    const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : displayedContainer.cookieStore.id;
    const confirmTitle = isPrivate
      ? browser.i18n.getMessage('confirmPrivateBrowsingClearCookie')
      : browser.i18n.getMessage('confirmContainerClearCookie', displayedContainer.name);
    this.confirmAsync(confirmTitle).then((result) => {
      if (!result) return;
      this._tabGroupService
        .removeBrowsingDataForTabGroupId(cookieStoreId)
        .then(() => {
          console.log('Removed browsing data for cookie store', cookieStoreId);
        })
        .catch((e) => {
          console.error(e);
        });
    });
  }

  public showDeleteContainerModal(displayedContainer: DisplayedContainer): void {
    if (displayedContainer.cookieStore.userContextId == 0) {
      console.warn('Cannot delete default container');
      return;
    }
    const cookieStoreId = displayedContainer.cookieStore.id;
    this.confirmAsync(browser.i18n.getMessage('confirmContainerDelete', displayedContainer.name)).then((result) => {
      if (!result) return;
      this._contextualIdentityFactory.remove(cookieStoreId).catch((e) => {
        console.error(e);
      });
      location.hash = '';
    });
  }

  public showSupergroupOptions(supergroup: SupergroupType): void {
    const title = browser.i18n.getMessage('groupOptions', supergroup.name);
    const modalMenuElement = new ModalMenuElement(title);
    modalMenuElement.defineAction('edit', browser.i18n.getMessage('buttonEditGroup'), false);
    modalMenuElement.defineAction('delete', browser.i18n.getMessage('buttonDeleteGroup'), false);
    modalMenuElement.defineAction('move', browser.i18n.getMessage('moveContainer'), false);
    modalMenuElement.defineAction('create-container', browser.i18n.getMessage('buttonNewContainer'), false);
    modalMenuElement.defineAction(
      'create-temporary-container',
      browser.i18n.getMessage('buttonNewTemporaryContainer'),
      false
    );
    modalMenuElement.defineAction('done', browser.i18n.getMessage('buttonDone'), true);
    document.body.appendChild(modalMenuElement);
    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
    modalMenuElement.onActionClicked.addListener(async (action) => {
      modalMenuElement.remove();
      switch (action) {
        case 'edit': {
          document.body.appendChild(new SupergroupEditorElement(supergroup));
          break;
        }

        case 'delete': {
          const answer = await this.confirmAsync(browser.i18n.getMessage('confirmGroupDelete', supergroup.name));
          if (answer) {
            await TabGroupDirectory.getInstance().removeSupergroup(tabGroupId);
          }
          break;
        }

        case 'move': {
          document.body.appendChild(new ModalMoveGroupElement(tabGroupId));
          break;
        }

        case 'create-container': {
          document.body.appendChild(new ContainerEditorElement(undefined, tabGroupId));
          break;
        }

        case 'create-temporary-container': {
          await SupergroupService.getInstance().createChildTemporaryContainer(tabGroupId);
          break;
        }
      }
    });
  }

  public async showContainerOptionsPanelAsync(
    displayedContainer: DisplayedContainer,
    isPrivate = false
  ): Promise<void> {
    isPrivate = isPrivate || displayedContainer.cookieStore.isPrivate;
    const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : displayedContainer.cookieStore.id;
    let contextualIdentity: ContextualIdentity | DisplayedContainer;
    const message = browser.i18n.getMessage(
      'containerOptions',
      isPrivate ? browser.i18n.getMessage('privateBrowsing') : displayedContainer.name
    );

    const modalMenuElement = new ModalMenuElement(message);
    document.body.appendChild(modalMenuElement);

    if (!isPrivate && displayedContainer.cookieStore.userContextId != 0) {
      contextualIdentity = await this._contextualIdentityFactory.get(cookieStoreId);
      modalMenuElement.defineAction('edit', browser.i18n.getMessage('buttonEditContainer'), false);
      modalMenuElement.defineAction('delete', browser.i18n.getMessage('buttonDeleteContainer'), false);
    } else {
      contextualIdentity = await this._displayedContainerService.getDisplayedContainer(cookieStoreId);
    }

    modalMenuElement.defineAction('clearCookie', browser.i18n.getMessage('buttonContainerClearCookie'), false);
    modalMenuElement.defineAction('move', browser.i18n.getMessage('moveContainer'), false);
    modalMenuElement.defineAction('done', browser.i18n.getMessage('buttonDone'), true);

    await new Promise<void>((res) => {
      const actionHandler = (action: string) => {
        modalMenuElement.onActionClicked.removeListener(actionHandler);
        switch (action) {
          case 'edit': {
            if (contextualIdentity instanceof ContextualIdentity) {
              this.showEditContainerPanelAsync(contextualIdentity).catch((e) => {
                console.error(e);
              });
            }
            break;
          }

          case 'clearCookie': {
            this.showContainerClearCookieModal(displayedContainer, isPrivate);
            break;
          }

          case 'delete': {
            this.showDeleteContainerModal(displayedContainer);
            break;
          }

          case 'move': {
            const modalMoveElement = new ModalMoveGroupElement(displayedContainer.cookieStore.id);
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
