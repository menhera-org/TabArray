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

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { DisplayedContainerDao } from '../../../lib/states/DisplayedContainerDao';
import { TabDao } from '../../../lib/states/TabDao';
import { IndexTabService } from '../../../lib/tabs/IndexTabService';
import { SupergroupType } from '../../../lib/tabGroups/TabGroupDirectory';
import { TabGroupAttributes } from '../../../lib/tabGroups/TabGroupAttributes';
import { TabGroupDirectorySnapshot } from '../../../lib/tabGroups/TabGroupDirectorySnapshot';

import { ContainerRow } from './ContainerRow';
import { SupergroupRow } from './SupergroupRow';

import styles from './ContainersView.module.css';

export type ContainerNode =
  | { type: 'container'; container: DisplayedContainer; tabCount: number; dimmed: boolean }
  | { type: 'supergroup'; tabGroupId: string; supergroup: SupergroupType; tabCount: number; members: ContainerNode[] };

/**
 * Private browsing first, then the containers in the user's group tree.
 * Groups count the tabs of all their members. Index tabs are not counted, except in private browsing.
 */
export const getContainerTree = (browserState: BrowserStateDao): ContainerNode[] => {
  const indexTabService = IndexTabService.getInstance();
  const snapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
  const containers = browserState.displayedContainers.map((dao) => DisplayedContainerDao.toDisplayedContainer(dao));
  const tabsOf = (cookieStoreId: string) =>
    (browserState.tabIdsByContainer[cookieStoreId] ?? []).map((tabId) =>
      TabDao.toCompatTab(browserState.tabs[tabId] as TabDao)
    );
  const normalContainers = new Map(
    containers.filter((c) => !c.cookieStore.isPrivate).map((c) => [c.cookieStore.id, c] as const)
  );

  const membersOf = (supergroup: SupergroupType): ContainerNode[] =>
    supergroup.members.flatMap((tabGroupId): ContainerNode[] => {
      if (new TabGroupAttributes(tabGroupId).tabGroupType == 'cookieStore') {
        const container = normalContainers.get(tabGroupId);
        if (!container) return [];
        const tabCount = indexTabService.filterOutIndexTabs(tabsOf(tabGroupId)).length;
        return [{ type: 'container', container, tabCount, dimmed: tabCount < 1 }];
      }
      const child = snapshot.getSupergroup(tabGroupId) as SupergroupType;
      const members = membersOf(child);
      const tabCount = members.reduce((sum, member) => sum + member.tabCount, 0);
      return [{ type: 'supergroup', tabGroupId, supergroup: child, tabCount, members }];
    });

  const privateNodes = containers
    .filter((c) => c.cookieStore.isPrivate)
    .map((container): ContainerNode => {
      return { type: 'container', container, tabCount: tabsOf(container.cookieStore.id).length, dimmed: false };
    });
  const root = snapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType;
  return [...privateNodes, ...membersOf(root)];
};

export type ContainersViewCallbacks = {
  onContainerClick: (container: DisplayedContainer) => void;
  onContainerClose: (container: DisplayedContainer) => void;
  onContainerOptions: (container: DisplayedContainer) => void;
  onSupergroupClose: (tabGroupId: string) => void;
  onSupergroupOptions: (supergroup: SupergroupType) => void;
};

const Nodes = ({ nodes, callbacks }: { nodes: ContainerNode[]; callbacks: ContainersViewCallbacks }) =>
  nodes.map((node) =>
    node.type == 'container' ? (
      <ContainerRow
        key={node.container.cookieStore.id}
        container={node.container}
        tabCount={node.tabCount}
        dimmed={node.dimmed}
        onClick={() => callbacks.onContainerClick(node.container)}
        onClose={() => callbacks.onContainerClose(node.container)}
        onOptions={() => callbacks.onContainerOptions(node.container)}
      />
    ) : (
      <SupergroupRow
        key={node.tabGroupId}
        name={node.supergroup.name}
        tabCount={node.tabCount}
        onClose={() => callbacks.onSupergroupClose(node.tabGroupId)}
        onOptions={() => callbacks.onSupergroupOptions(node.supergroup)}
      >
        <Nodes nodes={node.members} callbacks={callbacks} />
      </SupergroupRow>
    )
  );

export const ContainersView = ({ nodes, ...callbacks }: { nodes: ContainerNode[] } & ContainersViewCallbacks) =>
  nodes.length > 0 && (
    <div className={styles.containers}>
      <Nodes nodes={nodes} callbacks={callbacks} />
    </div>
  );
