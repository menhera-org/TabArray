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

import styles from './TagRow.module.css';

type TagRowProps = {
  name: string;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** A tag heading above the tabs that carry it. */
export const TagRow = ({ name, onClick, onEdit, onDelete }: TagRowProps) => (
  <div className={styles.header}>
    <button className={styles.tagButton} onClick={onClick}>
      <span className={styles.icon} />
      <span className={styles.name}>{name}</span>
    </button>
    <button
      className={`${styles.iconButton} ${styles.deleteButton}`}
      title={browser.i18n.getMessage('buttonDeleteTag')}
      onClick={onDelete}
    />
    <button
      className={`${styles.iconButton} ${styles.editButton}`}
      title={browser.i18n.getMessage('buttonEditTag')}
      onClick={onEdit}
    />
  </div>
);
