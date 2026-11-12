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

import { type ReactNode } from 'react';

import styles from './ModalFrame.module.css';

export type DialogAction = {
  label: string;
  /** Drawn as the default (blue) button. */
  isDefault?: boolean;
  onClick: () => void;
};

type ModalFrameProps = {
  title?: string;
  children?: ReactNode;
  /** The buttons at the bottom. */
  actions: DialogAction[];
};

/** A dialog over the whole page: an optional title, content, and buttons. */
export const ModalFrame = ({ title, children, actions }: ModalFrameProps) => (
  <div className={styles.overlay} data-dialog>
    <div className={styles.content}>
      {title != null && <h2 className={styles.title}>{title}</h2>}
      {children}
      <div className={styles.actions}>
        {actions.map((action, i) => (
          <button key={i} className={action.isDefault ? styles.default : ''} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);
