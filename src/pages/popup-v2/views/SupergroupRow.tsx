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
import { type ReactNode } from 'react';

import styles from './SupergroupRow.module.css';

type SupergroupRowProps = {
  name: string;
  tabCount: number;
  onClose: () => void;
  onOptions: () => void;
  /** With both, collapse and expand buttons show while there are tabs; otherwise their space stays empty. */
  onHide?: () => void;
  onUnhide?: () => void;
  /** Member containers and groups, drawn indented. */
  children?: ReactNode;
};

/** A group of containers. The close button shows only when there are tabs. */
export const SupergroupRow = ({
  name,
  tabCount,
  onClose,
  onOptions,
  onHide,
  onUnhide,
  children,
}: SupergroupRowProps) => (
  <div>
    <div className={styles.header}>
      <button className={styles.groupButton}>
        <span className={styles.icon} />
        <span className={styles.name} data-tab-count={tabCount}>
          <span className={styles.nameInner}>{name}</span>
        </span>
      </button>
      {onHide && onUnhide && tabCount > 0 ? (
        <>
          <button
            className={`${styles.iconButton} ${styles.hideButton}`}
            title={browser.i18n.getMessage('tooltipCollapseContainers')}
            onClick={onHide}
          />
          <button
            className={`${styles.iconButton} ${styles.unhideButton}`}
            title={browser.i18n.getMessage('tooltipExpandContainers')}
            onClick={onUnhide}
          />
        </>
      ) : (
        <>
          <span className={styles.slot} />
          <span className={styles.slot} />
        </>
      )}
      <button
        className={`${styles.iconButton} ${styles.optionsButton}`}
        title={browser.i18n.getMessage('groupOptions', name)}
        onClick={onOptions}
      />
      {tabCount > 0 && (
        <button
          className={`${styles.iconButton} ${styles.closeButton}`}
          title={browser.i18n.getMessage('tooltipContainerCloseAll')}
          onClick={onClose}
        />
      )}
    </div>
    <div className={styles.members}>{children}</div>
  </div>
);
