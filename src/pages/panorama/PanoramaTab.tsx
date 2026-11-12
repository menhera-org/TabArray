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
import { type MouseEvent, useState } from 'react';

import styles from './PanoramaTab.module.css';

const TRANSPARENT = '/img/transparent.png';

export type PanoramaTabInfo = {
  id: number;
  url: string;
  title: string;
  favIconUrl: string;
  /** A screenshot, or '' when there is none. */
  previewUrl: string;
};

/** The tab's title, or its URL when it has none. */
export const tabLabel = (tab: PanoramaTabInfo) => tab.title || tab.url;

/** The tab's icon: extension pages get the extension icon; tabs without an icon get none. */
export const tabIcon = (tab: PanoramaTabInfo) =>
  tab.url == 'about:addons' || tab.favIconUrl == 'chrome://mozapps/skin/extensions/extension.svg'
    ? '/img/firefox-icons/extension.svg'
    : tab.favIconUrl || TRANSPARENT;

type PanoramaTabProps = {
  tab: PanoramaTabInfo;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: () => void;
};

/** A tab as a card: its preview, a close button, its icon and its title. Dragging it carries its id. */
export const PanoramaTab = ({ tab, onActivate, onClose, onContextMenu }: PanoramaTabProps) => {
  const [iconFailed, setIconFailed] = useState(false);
  const activate = (ev: MouseEvent) => {
    ev.preventDefault();
    onActivate();
  };
  return (
    <div
      className={styles.tab}
      draggable
      title={tab.url || undefined}
      // https://qiita.com/piroor/items/44ccbc2ee918bc88c3ea
      onContextMenuCapture={onContextMenu}
      onDragStart={(ev) => {
        ev.dataTransfer.setData('application/json', JSON.stringify({ id: tab.id }));
        ev.dataTransfer.dropEffect = 'move';
      }}
    >
      <button className={styles.preview} onClick={activate}>
        <img
          className={styles.previewImage}
          src={tab.previewUrl || '/img/firefox-icons/defaultPreview.svg'}
          draggable={false}
          alt=""
        />
      </button>
      <div className={styles.controls}>
        <button
          className={styles.close}
          title={browser.i18n.getMessage('buttonTabClose')}
          onClick={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            onClose();
          }}
        >
          {browser.i18n.getMessage('buttonTabClose')}
        </button>
      </div>
      <div className={styles.info} onClick={activate}>
        <img
          className={styles.icon}
          src={iconFailed ? TRANSPARENT : tabIcon(tab)}
          onError={() => setIconFailed(true)}
          alt=""
        />
        <div className={styles.title}>{tabLabel(tab)}</div>
      </div>
    </div>
  );
};
