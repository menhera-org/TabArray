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
import { type DragEvent, useEffect, useRef } from 'react';
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { config } from '../../../config/config';

import { TabFavicon } from './TabFavicon';
import { FOCUSABLE } from './focus';

import styles from './TabRow.module.css';

export type TabActions = {
  activate: (tabId: number) => void;
  close: (tabId: number) => void;
  setPinned: (tabId: number, pinned: boolean) => void;
  showContextMenu: (tabId: number) => void;
  /** Moves a tab to a position in its window. */
  move: (tabId: number, index: number) => void;
  /** Shift-, Ctrl- or Cmd-click adds or removes a tab from the selection, where there is one (#386). */
  toggleSelected?: (tabId: number) => void;
  isSelected?: (tabId: number) => boolean;
};

/** What a dragged tab row carries. */
export type TabDragData = { type: 'tab'; id: number; index: number; pinned: boolean; cookieStoreId: string };

const DRAG_FORMAT = 'application/json';

export const readTabDragData = (dataTransfer: DataTransfer | null): TabDragData | null => {
  const json = dataTransfer?.getData(DRAG_FORMAT);
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    return data?.type == 'tab' ? (data as TabDragData) : null;
  } catch {
    return null;
  }
};

const scrollToCenter = async (element: HTMLElement) => {
  const isPopup = document.body.classList.contains('popup');
  if (isPopup || (await config['tab.autoCenterInSidebar'].getValue())) {
    requestAnimationFrame(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
};

type TabRowProps = {
  tab: CompatTab;
  /** The tab's container, which colors the row. */
  container: DisplayedContainer;
  actions: TabActions;
  /**
   * Lets the row be dragged and reorders on drop: pinned tabs among pinned tabs,
   * other tabs within their container. Drops of other tabs go on to the parent.
   */
  draggable?: boolean;
};

export const TabRow = ({ tab, container, actions, draggable = false }: TabRowProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // The old element was rebuilt on every render and re-centered the active tab each time; so does this.
  useEffect(() => {
    if (!tab.active) return;
    const timer = setTimeout(() => {
      if (ref.current) scrollToCenter(ref.current).catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  });

  const cookieStoreId = container.cookieStore.id;
  const accepts = (data: TabDragData | null): data is TabDragData =>
    data != null && data.pinned == tab.pinned && (tab.pinned || data.cookieStoreId == cookieStoreId);
  const dragHandlers = draggable
    ? {
        draggable: true,
        onDragStart: (ev: DragEvent<HTMLDivElement>) => {
          const data: TabDragData = { type: 'tab', id: tab.id, index: tab.index, pinned: tab.pinned, cookieStoreId };
          ev.dataTransfer.setData(DRAG_FORMAT, JSON.stringify(data));
          ev.dataTransfer.dropEffect = 'move';
        },
        onDragOver: (ev: DragEvent<HTMLDivElement>) => {
          if (accepts(readTabDragData(ev.dataTransfer))) ev.preventDefault();
        },
        onDrop: (ev: DragEvent<HTMLDivElement>) => {
          const data = readTabDragData(ev.dataTransfer);
          if (!accepts(data)) return;
          ev.preventDefault();
          actions.move(data.id, tab.index);
        },
      }
    : undefined;

  const colored = container.cookieStore.userContextId != 0 && container.colorCode;
  return (
    <div
      ref={ref}
      className={styles.tab}
      onAuxClick={(ev) => {
        if (ev.button == 1) actions.close(tab.id);
      }}
      onContextMenu={() => actions.showContextMenu(tab.id)}
      {...dragHandlers}
    >
      <img
        className={styles.privateIcon}
        src="/img/firefox-icons/private-browsing-icon.svg"
        alt=""
        style={{ visibility: tab.isPrivate ? 'visible' : 'hidden' }}
      />
      <div
        className={`${styles.main} ${actions.isSelected?.(tab.id) ? styles.selected : ''}`}
        style={colored ? { borderColor: container.colorCode } : undefined}
      >
        <button
          className={`${styles.pinButton} ${tab.pinned ? styles.pinned : ''}`}
          title={browser.i18n.getMessage(tab.pinned ? 'tooltipTabUnpinButton' : 'tooltipTabPinButton')}
          onClick={() => actions.setPinned(tab.id, !tab.pinned)}
        />
        <button
          className={`${styles.tabButton} ${tab.discarded ? styles.discarded : ''} ${tab.active ? styles.active : ''}`}
          title={tab.url}
          onClick={(ev) => {
            if (actions.toggleSelected && (ev.shiftKey || ev.ctrlKey || ev.metaKey)) {
              actions.toggleSelected(tab.id);
            } else {
              actions.activate(tab.id);
            }
          }}
          {...FOCUSABLE}
        >
          <TabFavicon url={tab.favIconUrl} />
          <span className={styles.title}>{tab.title}</span>
        </button>
        <button
          className={styles.closeButton}
          title={browser.i18n.getMessage('buttonTabClose')}
          onClick={() => actions.close(tab.id)}
        />
      </div>
    </div>
  );
};
