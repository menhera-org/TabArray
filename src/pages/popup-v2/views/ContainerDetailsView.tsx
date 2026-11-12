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
import { Fragment } from 'react';
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { TabDao } from '../../../lib/states/TabDao';
import { IndexTab } from '../../../lib/tabs/IndexTab';

import { TabRow, TabActions } from './TabRow';

import styles from './ContainerDetailsView.module.css';

export type WindowTabs = { windowId: number; isCurrentWindow: boolean; tabs: CompatTab[] };

/** The container's tabs in their usual order, split into runs of the same window. Index tabs are left out. */
export const getContainerTabsByWindow = (browserState: BrowserStateDao, cookieStoreId: string): WindowTabs[] => {
  const runs: WindowTabs[] = [];
  for (const tabId of browserState.tabIdsByContainer[cookieStoreId] ?? []) {
    const tab = TabDao.toCompatTab(browserState.tabs[tabId] as TabDao);
    if (IndexTab.isIndexTabUrl(tab.url)) continue;
    const last = runs[runs.length - 1];
    if (last?.windowId == tab.windowId) {
      last.tabs.push(tab);
    } else {
      runs.push({ windowId: tab.windowId, isCurrentWindow: browserState.currentWindowId == tab.windowId, tabs: [tab] });
    }
  }
  return runs;
};

type ContainerDetailsViewProps = {
  container: DisplayedContainer;
  windows: WindowTabs[];
  tabActions: TabActions;
};

export const ContainerDetailsView = ({ container, windows, tabActions }: ContainerDetailsViewProps) =>
  windows.map((run, i) => (
    // A window can appear more than once, so the position is the key.
    <Fragment key={i}>
      <div className={styles.windowLabel}>
        {browser.i18n.getMessage(run.isCurrentWindow ? 'currentWindow' : 'windowLabel', String(run.windowId))}
      </div>
      {run.tabs.map((tab) => (
        <TabRow key={tab.id} tab={tab} container={container} actions={tabActions} />
      ))}
    </Fragment>
  ));
