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

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { SupergroupType, TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { TabGroupAttributes } from '../../lib/tabGroups/TabGroupAttributes';
import { SupergroupService } from '../../lib/tabGroups/SupergroupService';

import { showDialog } from '../../frontend/dialogs/showDialog';
import {
  ConfirmDialog,
  MenuAction,
  MenuDialog,
  MoveGroupDialog,
  SupergroupEditorDialog,
} from '../../frontend/dialogs/dialogs';
import { ContainerEditorDialog } from '../../frontend/dialogs/ContainerEditorDialog';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const logError = (e: unknown) => console.error(e);
const message = (name: string, substitution?: string) => browser.i18n.getMessage(name, substitution);
const contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();

/** The popup's dialogs. */

export const confirmAsync = (title: string): Promise<boolean> =>
  new Promise((resolve) => {
    showDialog((close) => (
      <ConfirmDialog
        title={title}
        onCancel={() => {
          close();
          resolve(false);
        }}
        onOk={() => {
          close();
          resolve(true);
        }}
      />
    ));
  });

/** Shows a menu; choosing an action closes it first. */
const showMenu = (title: string, actions: MenuAction[], onAction: (id: string) => void) => {
  showDialog((close) => (
    <MenuDialog
      title={title}
      actions={actions}
      onAction={(id) => {
        close();
        onAction(id);
      }}
    />
  ));
};

export const showContainerEditor = (parentTabGroupId?: string) => {
  showDialog((close) => <ContainerEditorDialog parentTabGroupId={parentTabGroupId} onClose={close} />);
};

/** Resolves with the new container, or null when cancelled. */
export const showNewContainerPanelAsync = (): Promise<ContextualIdentity | null> =>
  new Promise((resolve) => {
    showDialog((close) => (
      <ContainerEditorDialog
        onCreated={(cookieStoreId) => {
          contextualIdentityFactory.get(cookieStoreId).then(resolve, () => resolve(null));
        }}
        onCancel={() => resolve(null)}
        onClose={close}
      />
    ));
  });

const showEditContainerPanel = (contextualIdentity: ContextualIdentity) => {
  showDialog((close) => <ContainerEditorDialog contextualIdentity={contextualIdentity} onClose={close} />);
};

export const showSupergroupEditor = (supergroup?: SupergroupType) => {
  showDialog((close) => <SupergroupEditorDialog supergroup={supergroup} onClose={close} />);
};

export const showMoveGroup = (tabGroupId: string) => {
  showDialog((close) => <MoveGroupDialog tabGroupId={tabGroupId} onClose={close} />);
};

const showContainerClearCookieModal = (displayedContainer: DisplayedContainer, isPrivate: boolean) => {
  const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : displayedContainer.cookieStore.id;
  const title = isPrivate
    ? message('confirmPrivateBrowsingClearCookie')
    : message('confirmContainerClearCookie', displayedContainer.name);
  confirmAsync(title)
    .then(async (confirmed) => {
      if (!confirmed) return;
      await TabGroupService.getInstance().removeBrowsingDataForTabGroupId(cookieStoreId);
      console.log('Removed browsing data for cookie store', cookieStoreId);
    })
    .catch(logError);
};

const showDeleteContainerModal = (displayedContainer: DisplayedContainer) => {
  if (displayedContainer.cookieStore.userContextId == 0) {
    console.warn('Cannot delete default container');
    return;
  }
  confirmAsync(message('confirmContainerDelete', displayedContainer.name))
    .then((confirmed) => {
      if (!confirmed) return;
      contextualIdentityFactory.remove(displayedContainer.cookieStore.id).catch(logError);
      location.hash = '';
    })
    .catch(logError);
};

export const showSupergroupOptions = (supergroup: SupergroupType) => {
  const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId);
  showMenu(
    message('groupOptions', supergroup.name),
    [
      { id: 'edit', label: message('buttonEditGroup') },
      { id: 'delete', label: message('buttonDeleteGroup') },
      { id: 'move', label: message('moveContainer') },
      { id: 'create-container', label: message('buttonNewContainer') },
      { id: 'create-temporary-container', label: message('buttonNewTemporaryContainer') },
      { id: 'done', label: message('buttonDone'), isDefault: true },
    ],
    (action) => {
      switch (action) {
        case 'edit':
          showSupergroupEditor(supergroup);
          break;
        case 'delete':
          confirmAsync(message('confirmGroupDelete', supergroup.name))
            .then((confirmed) => (confirmed ? TabGroupDirectory.getInstance().removeSupergroup(tabGroupId) : undefined))
            .catch(logError);
          break;
        case 'move':
          showMoveGroup(tabGroupId);
          break;
        case 'create-container':
          showContainerEditor(tabGroupId);
          break;
        case 'create-temporary-container':
          SupergroupService.getInstance().createChildTemporaryContainer(tabGroupId).catch(logError);
          break;
      }
    }
  );
};

export const showContainerOptionsPanelAsync = async (displayedContainer: DisplayedContainer, isPrivate = false) => {
  isPrivate = isPrivate || displayedContainer.cookieStore.isPrivate;
  const editable = !isPrivate && displayedContainer.cookieStore.userContextId != 0;
  const contextualIdentity = editable ? await contextualIdentityFactory.get(displayedContainer.cookieStore.id) : null;
  const actions: MenuAction[] = [
    ...(editable
      ? [
          { id: 'edit', label: message('buttonEditContainer') },
          { id: 'delete', label: message('buttonDeleteContainer') },
        ]
      : []),
    { id: 'clearCookie', label: message('buttonContainerClearCookie') },
    { id: 'move', label: message('moveContainer') },
    { id: 'done', label: message('buttonDone'), isDefault: true },
  ];
  showMenu(
    message('containerOptions', isPrivate ? message('privateBrowsing') : displayedContainer.name),
    actions,
    (action) => {
      switch (action) {
        case 'edit':
          if (contextualIdentity instanceof ContextualIdentity) showEditContainerPanel(contextualIdentity);
          break;
        case 'clearCookie':
          showContainerClearCookieModal(displayedContainer, isPrivate);
          break;
        case 'delete':
          showDeleteContainerModal(displayedContainer);
          break;
        case 'move':
          showMoveGroup(displayedContainer.cookieStore.id);
          break;
      }
    }
  );
};
