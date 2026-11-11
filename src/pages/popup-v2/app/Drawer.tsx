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

import styles from './Drawer.module.css';

type DrawerProps = {
  open: boolean;
  heading: string;
  onClose: () => void;
  children: ReactNode;
};

/** A panel over the left of the page. Its content stays mounted while it is closed. */
export const Drawer = ({ open, heading, onClose, children }: DrawerProps) => (
  <div id="drawer" className={styles.drawer} hidden={!open}>
    <div className={styles.scrim} onClick={onClose} />
    <div className={styles.main}>
      <div className={styles.header}>
        {/* data-drawer-close: a stable hook for tools such as the smoke test. */}
        <button className={styles.closeButton} onClick={onClose} data-drawer-close />
        <h2 className={styles.heading}>{heading}</h2>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  </div>
);
