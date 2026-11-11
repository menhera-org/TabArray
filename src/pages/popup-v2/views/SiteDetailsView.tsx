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

import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { DisplayedContainerDao } from '../../../lib/states/DisplayedContainerDao';
import { TabDao } from '../../../lib/states/TabDao';
import { IndexTabService } from '../../../lib/tabs/IndexTabService';

import { ContainerRow } from './ContainerRow';
import { TabRow, TabActions } from './TabRow';

export type ContainerTabs = { container: DisplayedContainer; tabs: CompatTab[] };

/** The site's tabs without index tabs. */
export const getSiteTabs = (browserState: BrowserStateDao, domain: string): CompatTab[] =>
  IndexTabService.getInstance().filterOutIndexTabs(
    (browserState.tabIdsBySite[domain] ?? []).map((tabId) => TabDao.toCompatTab(browserState.tabs[tabId] as TabDao))
  );

/**
 * The site's tabs grouped by container, in the order the containers first appear,
 * each group sorted by window and position. Tabs of unknown containers are left out.
 */
export const getSiteTabsByContainer = (browserState: BrowserStateDao, domain: string): ContainerTabs[] => {
  const tabsByContainer = new Map<string, CompatTab[]>();
  for (const tab of getSiteTabs(browserState, domain)) {
    const tabs = tabsByContainer.get(tab.cookieStore.id) ?? [];
    tabs.push(tab);
    tabsByContainer.set(tab.cookieStore.id, tabs);
  }
  const containers = browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
  return [...tabsByContainer].flatMap(([cookieStoreId, tabs]) => {
    const container = containers.find((c) => c.cookieStore.id == cookieStoreId);
    if (!container) return [];
    tabs.sort((a, b) => (a.windowId == b.windowId ? a.index - b.index : a.windowId - b.windowId));
    return [{ container, tabs }];
  });
};

type SiteDetailsViewProps = {
  containers: ContainerTabs[];
  tabActions: TabActions;
  onContainerClose: (container: DisplayedContainer) => void;
  onContainerOptions: (container: DisplayedContainer) => void;
};

export const SiteDetailsView = ({
  containers,
  tabActions,
  onContainerClose,
  onContainerOptions,
}: SiteDetailsViewProps) =>
  containers.map(({ container, tabs }) => (
    <ContainerRow
      key={container.cookieStore.id}
      container={container}
      tabCount={tabs.length}
      onClose={() => onContainerClose(container)}
      onOptions={() => onContainerOptions(container)}
    >
      {tabs.map((tab) => (
        <TabRow key={tab.id} tab={tab} container={container} actions={tabActions} />
      ))}
    </ContainerRow>
  ));
