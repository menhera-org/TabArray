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

import { type ReactNode, useLayoutEffect, useRef } from 'react';

import styles from './ModalFrame.module.css';

export type DialogAction = {
  label: string;
  /** Drawn as the primary button. */
  isDefault?: boolean;
  onClick: () => void;
};

type ModalFrameProps = {
  title?: string;
  children?: ReactNode;
  /** The buttons at the bottom. */
  actions: DialogAction[];
  /** Lists the actions other than the default ones as menu items, above the buttons. */
  menu?: boolean;
  /** Escape. Without it, Escape does nothing. */
  onCancel?: () => void;
};

const ActionButton = ({ action }: { action: DialogAction }) => (
  <button className={`ctg-button ${action.isDefault ? 'primary' : ''}`} onClick={action.onClick}>
    {action.label}
  </button>
);

/**
 * A modal dialog: an optional title, content, and buttons. It takes focus (its first control)
 * and makes the page behind it inert while open, and gives focus back when it goes away.
 */
export const ModalFrame = ({ title, children, actions, menu = false, onCancel }: ModalFrameProps) => {
  const menuItems = menu ? actions.filter((action) => !action.isDefault) : [];
  const buttons = menu ? actions.filter((action) => action.isDefault) : actions;
  const dialog = useRef<HTMLDialogElement>(null);
  // A layout effect, so the cleanup runs while the dialog is still in the document.
  useLayoutEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const defaultAction = actions.find((action) => action.isDefault);
  return (
    <dialog
      ref={dialog}
      className={styles.content}
      aria-label={title}
      onCancel={(ev) => {
        // The dialog closes when React removes it.
        ev.preventDefault();
        onCancel?.();
      }}
      onKeyDown={(ev) => {
        // Enter in a text field means the default button, as in a form.
        const target = ev.target;
        if (ev.key == 'Enter' && target instanceof HTMLInputElement && target.type == 'text' && defaultAction) {
          ev.preventDefault();
          defaultAction.onClick();
        }
      }}
    >
      <div>
        {title != null && <h2 className={styles.title}>{title}</h2>}
        {children}
        {menuItems.length > 0 && (
          <div className={styles.menu} role="menu">
            {menuItems.map((action, i) => (
              <button key={i} className={styles.menuItem} role="menuitem" onClick={action.onClick}>
                {action.label}
              </button>
            ))}
          </div>
        )}
        {buttons.length > 0 && (
          <div className={styles.actions}>
            {buttons.map((action, i) => (
              <ActionButton key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};
