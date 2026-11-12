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
import { type CSSProperties, type ReactNode } from 'react';
import { CookieStore, DisplayedContainer } from 'weeg-containers';

import { SupergroupType } from '../../lib/tabGroups/TabGroupDirectory';
import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TabGroupAttributes } from '../../lib/tabGroups/TabGroupAttributes';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { CompatConsole } from '../../lib/console/CompatConsole';

import { cssUrl } from '../../frontend/cssUrl';
import { ChangeSource, useLoaded } from '../../frontend/useLoaded';

import styles from './TabGroupListing.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export type ListingRow = {
  tabGroupId: string;
  /** How deep in groups. */
  nesting: number;
  name: string;
  icon: string;
  isGroup: boolean;
  /** Drawn as a mask in the text color (Firefox's default container icon, and groups). */
  maskedIcon: boolean;
};

/** Every container and group in the user's order, groups followed by their members. */
export const getListingRows = (
  snapshot: TabGroupDirectorySnapshot,
  containers: Map<string, DisplayedContainer>
): ListingRow[] => {
  const rows: ListingRow[] = [];
  const visit = (supergroup: SupergroupType, nesting: number) => {
    for (const tabGroupId of supergroup.members) {
      if (new TabGroupAttributes(tabGroupId).tabGroupType == 'cookieStore') {
        const container = containers.get(tabGroupId);
        if (!container) continue;
        const isDefault = container.cookieStore.userContextId == 0;
        rows.push({
          tabGroupId,
          nesting,
          isGroup: false,
          name: container.name,
          icon: container.iconUrl,
          maskedIcon: isDefault,
        });
      } else {
        const child = snapshot.getSupergroup(tabGroupId) as SupergroupType;
        rows.push({
          tabGroupId,
          nesting,
          isGroup: true,
          name: child.name,
          icon: '/img/firefox-icons/folder.svg',
          maskedIcon: true,
        });
        visit(child, nesting + 1);
      }
    }
  };
  visit(snapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType, 0);
  return rows;
};

const tabGroupDirectory = TabGroupService.getInstance().directory;

const loadRows = async (): Promise<ListingRow[]> => {
  const contextualIdentityService = ContextualIdentityService.getInstance();
  const snapshot = await tabGroupDirectory.getSnapshot();
  const containers = new Map<string, DisplayedContainer>();
  for (const cookieStoreId of snapshot.getContainerOrder()) {
    const cookieStore = new CookieStore(cookieStoreId);
    containers.set(
      cookieStoreId,
      cookieStore.userContextId == 0
        ? contextualIdentityService.getDisplayedContainerFactory().createFromCookieStore(cookieStore)
        : await contextualIdentityService.getFactory().get(cookieStoreId)
    );
  }
  return getListingRows(snapshot, containers);
};

const iconStyle = (row: ListingRow): CSSProperties =>
  row.maskedIcon
    ? { maskImage: cssUrl(row.icon), maskSize: row.isGroup ? '50%' : '75%' }
    : { backgroundImage: cssUrl(row.icon) };

type TabGroupListingProps = {
  /** Up and down buttons that reorder the containers and groups. */
  sortable?: boolean;
  /** Headings of the extra columns, already translated. */
  columns: string[];
  /** The CSS grid columns: the name, then one per extra column. */
  gridTemplateColumns: string;
  /** The extra columns' cells for one container or group. */
  cells: (tabGroupId: string) => ReactNode;
  /** Also reload the rows on this (the Proxies pane did on proxy changes). */
  reloadOn?: ChangeSource;
};

/** A table of the containers and groups, as the Options page shows them in several panes. */
export const TabGroupListing = ({
  sortable = false,
  columns,
  gridTemplateColumns,
  cells,
  reloadOn,
}: TabGroupListingProps) => {
  const rows = useLoaded(loadRows, reloadOn ? [tabGroupDirectory.onChanged, reloadOn] : tabGroupDirectory.onChanged);
  const move = (tabGroupId: string, up: boolean) => {
    (up ? tabGroupDirectory.moveTabGroupUp(tabGroupId) : tabGroupDirectory.moveTabGroupDown(tabGroupId)).catch((e) =>
      console.error(e)
    );
  };
  return (
    <div className={styles.listing} style={{ gridTemplateColumns }}>
      <div className={styles.header}>
        <div>{browser.i18n.getMessage('menuItemMain')}</div>
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      <div className={styles.rows}>
        {rows?.map((row) => (
          <div key={row.tabGroupId} className={styles.row}>
            <div className={styles.rowInner} style={{ marginInlineStart: `${row.nesting * 2}em` }}>
              <div className={`${styles.icon} ${row.maskedIcon ? styles.masked : ''}`} style={iconStyle(row)} />
              <div className={styles.name}>{row.name}</div>
              {sortable && (
                <>
                  <button className={`${styles.move} ${styles.up}`} onClick={() => move(row.tabGroupId, true)} />
                  <button className={`${styles.move} ${styles.down}`} onClick={() => move(row.tabGroupId, false)} />
                </>
              )}
            </div>
            {cells(row.tabGroupId)}
          </div>
        ))}
      </div>
    </div>
  );
};
