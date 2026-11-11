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

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

import { getGlobalMenuActions } from './globalMenu';
import { MenuItem } from './MenuItem';

import styles from './TopBar.module.css';

/** Where the active screen puts its heading and menu items. */
const TopBarSlot = createContext<HTMLElement | null>(null);

/** The button that opens the page's drawer. */
export type DrawerButton = {
  icon: string;
  /** i18n message name of the tooltip. */
  label?: string;
  onClick: () => void;
};

type TopBarProps = {
  /** A back button instead of the drawer button. */
  onBack: (() => void) | null;
  drawerButton: DrawerButton;
  spinning: boolean;
  /** Which global menu items to show (see globalMenu). */
  isPopup: boolean;
  /** The screens, which fill in the top bar through ScreenTopBar. */
  children: ReactNode;
};

export const TopBar = ({ onBack, drawerButton, spinning, isPopup, children }: TopBarProps) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const actions = getGlobalMenuActions(isPopup);
  const menuItem = (action: (typeof actions)[number], iconOnly: boolean) => (
    <MenuItem
      key={action.id}
      icon={action.icon}
      iconInColor={action.iconInColor}
      label={action.label}
      iconOnly={iconOnly}
      onClick={action.run}
    />
  );
  return (
    <>
      <div className={styles.topBar}>
        {onBack ? (
          <button className={styles.backButton} onClick={onBack} />
        ) : (
          <MenuItem
            className={styles.drawerButton}
            icon={drawerButton.icon}
            label={drawerButton.label}
            iconOnly
            onClick={drawerButton.onClick}
          />
        )}
        <div className={`${styles.spinner} ${spinning ? '' : styles.spinnerDisabled}`} />
        <span className={styles.slot} ref={setSlot} />
        {actions.filter((a) => !a.overflow).map((a) => menuItem(a, true))}
        <MenuItem icon="/img/material-icons/more_vert.svg" iconOnly>
          {actions.filter((a) => a.overflow).map((a) => menuItem(a, false))}
        </MenuItem>
      </div>
      <TopBarSlot value={slot}>{children}</TopBarSlot>
    </>
  );
};

type ScreenTopBarProps = {
  /** Only the active screen fills in the top bar. */
  active: boolean;
  heading: string;
  /** The screen's own menu items, before the global ones. */
  children?: ReactNode;
};

export const ScreenTopBar = ({ active, heading, children }: ScreenTopBarProps) => {
  const slot = useContext(TopBarSlot);
  if (!active || !slot) return null;
  return createPortal(
    <>
      <h1 className={styles.heading}>{heading}</h1>
      {children}
    </>,
    slot
  );
};
