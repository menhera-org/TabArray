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
import { type DragEvent, type ReactNode } from 'react';
import { DisplayedContainer } from 'weeg-containers';

import { cssUrl } from './TabFavicon';
import { readTabDragData } from './TabRow';
import { FOCUSABLE } from './focus';

import styles from './ContainerRow.module.css';

type ContainerRowProps = {
  container: DisplayedContainer;
  tabCount: number;
  /** Drawn faded, for containers without tabs. */
  dimmed?: boolean;
  /** The container's tabs are hidden in the window: the toggle and the name show them again. */
  hidden?: boolean;
  onClick?: () => void;
  onClose: () => void;
  onOptions: () => void;
  /** With both, a hide/show toggle shows while there are tabs. */
  onHide?: () => void;
  onUnhide?: () => void;
  /** Shows the "focus to this container" button. */
  onHighlight?: () => void;
  /** Accepts unpinned tabs of other containers dropped on the row. */
  onDropTab?: (tabId: number) => void;
  /** Tag and tab rows. */
  children?: ReactNode;
};

/** A container's header with its tabs below. The close button shows only when there are tabs. */
export const ContainerRow = ({
  container,
  tabCount,
  dimmed,
  hidden = false,
  onClick,
  onClose,
  onOptions,
  onHide,
  onUnhide,
  onHighlight,
  onDropTab,
  children,
}: ContainerRowProps) => {
  const isPrivate = container.cookieStore.isPrivate;
  const privateBrowsing = browser.i18n.getMessage('privateBrowsing');
  const droppedTabId = (ev: DragEvent) => {
    const data = readTabDragData(ev.dataTransfer);
    return data && !data.pinned && data.cookieStoreId != container.cookieStore.id ? data.id : null;
  };
  const dropHandlers = onDropTab && {
    onDragOver: (ev: DragEvent) => {
      if (droppedTabId(ev) != null) ev.preventDefault();
    },
    onDrop: (ev: DragEvent) => {
      const tabId = droppedTabId(ev);
      if (tabId == null) return;
      ev.preventDefault();
      onDropTab(tabId);
    },
  };
  return (
    <div
      className={`${styles.container} ${hidden ? styles.hidden : ''}`}
      style={dimmed ? { opacity: 0.75 } : undefined}
      {...dropHandlers}
    >
      <div className={styles.header}>
        {onHide && onUnhide && tabCount > 0 ? (
          <button
            className={`${styles.iconButton} ${styles.toggleButton}`}
            title={browser.i18n.getMessage(hidden ? 'tooltipUnhideContainerButton' : 'tooltipHideContainerButton')}
            onClick={hidden ? onUnhide : onHide}
          />
        ) : (
          <span />
        )}
        <button
          className={styles.containerButton}
          title={
            isPrivate
              ? privateBrowsing
              : browser.i18n.getMessage('defaultContainerName', String(container.cookieStore.userContextId))
          }
          onClick={hidden ? onUnhide : onClick}
          {...FOCUSABLE}
        >
          {isPrivate ? (
            <span className={`${styles.icon} ${styles.privateIcon}`} />
          ) : (
            <span
              className={styles.icon}
              style={{ backgroundColor: container.colorCode, maskImage: cssUrl(container.iconUrl) }}
            />
          )}
          <span className={styles.name} data-tab-count={tabCount}>
            <span className={styles.nameInner}>{isPrivate ? privateBrowsing : container.name}</span>
          </span>
        </button>
        {onHighlight && (
          <button
            className={`${styles.iconButton} ${styles.highlightButton}`}
            title={browser.i18n.getMessage('focusToThisContainer')}
            onClick={onHighlight}
          />
        )}
        <button
          className={`${styles.iconButton} ${styles.optionsButton}`}
          title={browser.i18n.getMessage('containerOptions', container.name)}
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
      {children}
    </div>
  );
};
