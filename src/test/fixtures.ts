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

import { DisplayedContainer } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { BrowserStateDao } from '../lib/states/BrowserStateDao';
import { DisplayedContainerDao } from '../lib/states/DisplayedContainerDao';
import { TabDao } from '../lib/states/TabDao';

export const tabDao = (id: number, fields: Partial<TabDao> = {}): TabDao => ({
  id,
  url: `https://example.com/${id}`,
  title: `Tab ${id}`,
  favIconUrl: '',
  windowId: 1,
  discarded: false,
  hidden: false,
  active: false,
  pinned: false,
  index: id,
  isSharing: false,
  lastAccessed: 0,
  muted: false,
  audible: false,
  cookieStoreId: 'firefox-default',
  ...fields,
});

export const compatTab = (id: number, fields: Partial<TabDao> = {}): CompatTab =>
  TabDao.toCompatTab(tabDao(id, fields));

export const containerDao = (cookieStoreId: string, name: string): DisplayedContainerDao => ({
  cookieStoreId,
  name,
  iconUrl: `resource://usercontext-content/${name}.svg`,
  colorCode: '#37adff',
});

export const container = (cookieStoreId: string, name: string): DisplayedContainer =>
  DisplayedContainerDao.toDisplayedContainer(containerDao(cookieStoreId, name));

/** A browser state with only the given fields filled in. */
export const browserState = (fields: Partial<BrowserStateDao>): BrowserStateDao =>
  ({
    tabs: {},
    tabIdsByContainer: {},
    tabIdsBySite: {},
    displayedContainers: [],
    supergroups: {},
    currentWindowId: 1,
    ...fields,
  }) as unknown as BrowserStateDao;
