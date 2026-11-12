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

import { cssUrl } from '../cssUrl';

import styles from './BottomNavigation.module.css';

export type NavigationTarget = {
  id: string;
  icon: string;
  /** Shown text. */
  label: string;
};

type BottomNavigationProps = {
  targets: NavigationTarget[];
  selected: string;
  /** Keyboard shortcuts by target id, shown as tooltips. */
  tooltips: Map<string, string>;
  onSelect: (id: string) => void;
};

export const BottomNavigation = ({ targets, selected, tooltips, onSelect }: BottomNavigationProps) => (
  <div className={styles.bottomNavigation}>
    <div className={styles.targets}>
      {targets.map((target) => (
        <button
          key={target.id}
          className={`${styles.target} ${target.id == selected ? styles.selected : ''}`}
          title={tooltips.get(target.id)}
          // A stable hook for tools such as the smoke test.
          data-target-id={target.id}
          onClick={() => onSelect(target.id)}
        >
          <span className={styles.iconPill}>
            <span className={styles.icon} style={{ maskImage: cssUrl(target.icon) }} />
          </span>
          <span>{target.label}</span>
        </button>
      ))}
    </div>
  </div>
);
