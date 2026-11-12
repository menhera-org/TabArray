/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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
import { type ReactNode, useEffect, useState } from 'react';

import { TabGroupDirectory, SupergroupType } from '../../lib/tabGroups/TabGroupDirectory';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabGroupAttributes } from '../../lib/tabGroups/TabGroupAttributes';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { ModalFrame } from './ModalFrame';
import { NameField } from './NameField';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const message = (name: string, substitution?: string) => browser.i18n.getMessage(name, substitution);

/** Removes surrounding whitespace, including non-ASCII spaces such as the ideographic space. */
export const cleanName = (name: string) => name.trim().replace(/^\s*|\s*$/gu, '');

type ConfirmDialogProps = { title: string; onOk: () => void; onCancel: () => void };

/** Asks to confirm something, with Cancel and a default OK. */
export const ConfirmDialog = ({ title, onOk, onCancel }: ConfirmDialogProps) => (
  <ModalFrame
    title={title}
    onCancel={onCancel}
    actions={[
      { label: message('buttonCancel'), onClick: onCancel },
      { label: message('buttonOk'), isDefault: true, onClick: onOk },
    ]}
  />
);

export type MenuAction = { id: string; label: string; isDefault?: boolean };

/** Offers a choice of actions; choosing one closes the menu before `onAction` runs. */
export const MenuDialog = ({
  title,
  actions,
  onAction,
}: {
  title: string;
  actions: MenuAction[];
  onAction: (id: string) => void;
}) => (
  <ModalFrame
    menu
    title={title}
    actions={actions.map((action) => ({ ...action, onClick: () => onAction(action.id) }))}
    onCancel={() => {
      // Escape is the default action, which closes the menu ("done").
      const done = actions.find((action) => action.isDefault);
      if (done) onAction(done.id);
    }}
  />
);

type NameDialogProps = {
  title: string;
  initialName?: string;
  /** Runs with a non-empty, cleaned name; the dialog then closes. */
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
};

/** Asks for a name, as the group editor did. An empty name does nothing. */
export const NameDialog = ({ title, initialName = '', onSave, onClose }: NameDialogProps) => {
  const [name, setName] = useState(initialName);
  return (
    <ModalFrame
      title={title}
      onCancel={onClose}
      actions={[
        { label: message('buttonCancel'), onClick: onClose },
        {
          label: message('buttonOk'),
          isDefault: true,
          onClick: () => {
            const cleaned = cleanName(name);
            if (cleaned == '') return;
            onSave(cleaned).then(onClose, (e) => console.error(e));
          },
        },
      ]}
    >
      <NameField value={name} onChange={setName} />
    </ModalFrame>
  );
};

const tabGroupDirectory = TabGroupDirectory.getInstance();

/** Creates a group, or renames one. */
export const SupergroupEditorDialog = ({
  supergroup,
  onClose,
}: {
  supergroup?: SupergroupType;
  onClose: () => void;
}) => (
  <NameDialog
    title={message(supergroup ? 'editGroupDialogTitle' : 'newGroupDialogTitle')}
    initialName={supergroup?.name}
    onSave={async (name) => {
      if (supergroup) {
        await tabGroupDirectory.renameSupergroup(
          TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroup.supergroupId),
          name
        );
      } else {
        await tabGroupDirectory.createSupergroup(name);
      }
    }}
    onClose={onClose}
  />
);

/** The groups a container or group can move into: not itself, nor any group inside it. */
export const getMoveTargets = (snapshot: TabGroupDirectorySnapshot, tabGroupId: string): [string, string][] => {
  const value = snapshot.value;
  return Object.keys(value)
    .filter((target) => target !== tabGroupId && !snapshot.hasChildTabGroupId(tabGroupId, target))
    .map((target) => {
      const supergroup = value[target] as SupergroupType;
      return [target, supergroup.supergroupId == 0 ? message('rootGroup') : supergroup.name];
    });
};

/** Moves a container or group into another group. */
export const MoveGroupDialog = ({ tabGroupId, onClose }: { tabGroupId: string; onClose: () => void }) => {
  const [targets, setTargets] = useState<[string, string][]>([]);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    tabGroupDirectory
      .getSnapshot()
      .then((snapshot) => setTargets(getMoveTargets(snapshot, tabGroupId)))
      .catch((e) => console.error(e));
  }, [tabGroupId]);
  const chosen = target ?? targets[0]?.[0] ?? '';
  return (
    <ModalFrame
      title={message('moveContainer')}
      onCancel={onClose}
      actions={[
        { label: message('buttonCancel'), onClick: onClose },
        {
          label: message('buttonMove'),
          isDefault: true,
          onClick: () => {
            tabGroupDirectory.moveTabGroupToSupergroup(tabGroupId, chosen).then(onClose, (e) => console.error(e));
          },
        },
      ]}
    >
      <select value={chosen} onChange={(ev) => setTarget(ev.currentTarget.value)}>
        {targets.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </ModalFrame>
  );
};

/** A dialog that only shows something, closed with Done or Escape. */
export const InfoDialog = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
  <ModalFrame onCancel={onClose} actions={[{ label: message('buttonDone'), isDefault: true, onClick: onClose }]}>
    {children}
  </ModalFrame>
);
