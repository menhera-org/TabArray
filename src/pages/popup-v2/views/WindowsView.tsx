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
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { BrowserStateDao } from '../../../lib/states/BrowserStateDao';
import { WindowStateDao } from '../../../lib/states/WindowStateDao';
import { DisplayedContainerDao } from '../../../lib/states/DisplayedContainerDao';
import { TabDao } from '../../../lib/states/TabDao';
import { SupergroupType } from '../../../lib/tabGroups/TabGroupDirectory';
import { TabGroupAttributes } from '../../../lib/tabGroups/TabGroupAttributes';
import { TabGroupDirectorySnapshot } from '../../../lib/tabGroups/TabGroupDirectorySnapshot';
import { CompatConsole } from '../../../lib/console/CompatConsole';
import { IndexTab } from '../../../lib/tabs/IndexTab';
import { config } from '../../../config/config';

import { ContainerRow } from './ContainerRow';
import { SupergroupRow } from './SupergroupRow';
import { TabRow, TabActions } from './TabRow';
import { MenuItem } from '../../../frontend/frame/MenuItem';
import { FOCUSABLE } from './focus';

import styles from './WindowsView.module.css';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

export type WindowContainerNode =
  | {
      type: 'container';
      container: DisplayedContainer;
      /** Tabs other than index tabs, hidden ones included. */
      tabCount: number;
      /** Whether the container's last tab is hidden. */
      hidden: boolean;
      /** Has tabs in the window: offers "focus to this container". */
      open: boolean;
      /** Holds the window's active tab, and is highlighted (#8). */
      active: boolean;
      /** Visible tabs. */
      tabs: CompatTab[];
    }
  | {
      type: 'supergroup';
      tabGroupId: string;
      supergroup: SupergroupType;
      tabCount: number;
      members: WindowContainerNode[];
    };

export type TabWithContainer = { tab: CompatTab; container: DisplayedContainer };

export type WindowSummary = {
  isPrivate: boolean;
  tabCount: number;
  pinnedTabs: TabWithContainer[];
  openContainers: WindowContainerNode[];
  inactiveContainers: WindowContainerNode[];
};

/** The containers a window can use (private ones in private windows), in the user's order. */
const getWindowContainers = (browserState: BrowserStateDao, windowState: WindowStateDao): DisplayedContainer[] => {
  const snapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
  return browserState.displayedContainers
    .map((dao) => DisplayedContainerDao.toDisplayedContainer(dao))
    .filter((container) => container.cookieStore.isPrivate == windowState.isPrivate)
    .sort((a, b) => snapshot.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id));
};

/**
 * A container's row. Tabs of a collapsed tab group make it count as hidden, but are still listed
 * when `listCollapsedTabs` is set (#482).
 */
const containerNode = (
  container: DisplayedContainer,
  tabs: CompatTab[],
  open = false,
  collapsedTabIds: ReadonlySet<number> = new Set(),
  listCollapsedTabs = false
): WindowContainerNode => {
  const visibleTabs: CompatTab[] = [];
  let tabCount = 0;
  let hidden = false;
  for (const tab of tabs) {
    if (IndexTab.isIndexTabUrl(tab.url)) continue;
    tabCount++;
    const collapsed = collapsedTabIds.has(tab.id);
    hidden = tab.hidden || collapsed;
    if (tab.hidden || (collapsed && !listCollapsedTabs)) continue;
    visibleTabs.push(tab);
  }
  return { type: 'container', container, tabCount, hidden, open, active: false, tabs: visibleTabs };
};

/** Everything the Windows screen shows for one window when not searching. */
export const getWindowSummary = (
  browserState: BrowserStateDao,
  windowId: number,
  listCollapsedTabs = false
): WindowSummary => {
  const windowState = browserState.windows[windowId] as WindowStateDao;
  const collapsedTabIds = new Set(
    Object.values(windowState.tabs)
      .filter((tab) => tab.groupCollapsed)
      .map((tab) => tab.id)
  );
  const node = (container: DisplayedContainer, tabs: CompatTab[], open = false): WindowContainerNode =>
    ({
      ...containerNode(container, tabs, open, collapsedTabIds, listCollapsedTabs),
      active: windowState.activeContainers.includes(container.cookieStore.id),
    }) as WindowContainerNode;
  const containers = getWindowContainers(browserState, windowState);
  const containerOf = (tab: CompatTab) => containers.find((c) => c.cookieStore.id == tab.cookieStore.id);
  const tabsOf = (cookieStoreId: string) =>
    (windowState.unpinnedTabIdsByContainer[cookieStoreId] ?? []).map((tabId) =>
      TabDao.toCompatTab(windowState.tabs[tabId] as TabDao)
    );

  const pinnedTabs = windowState.pinnedTabIds
    .map((tabId) => TabDao.toCompatTab(windowState.tabs[tabId] as TabDao))
    .sort((a, b) => a.index - b.index)
    .flatMap((tab) => {
      const container = containerOf(tab);
      if (!container) {
        console.error('Could not find user context for pinned tab', tab);
        return [];
      }
      return [{ tab, container }];
    });

  const summary = (openContainers: WindowContainerNode[], inactiveContainers: WindowContainerNode[]) => ({
    isPrivate: windowState.isPrivate,
    tabCount: Object.values(windowState.tabs).length,
    pinnedTabs,
    openContainers,
    inactiveContainers,
  });

  if (windowState.isPrivate) {
    const isActive = (c: DisplayedContainer) => windowState.activeContainers.includes(c.cookieStore.id);
    return summary(
      containers.filter(isActive).map((c) => node(c, tabsOf(c.cookieStore.id), true)),
      containers.filter((c) => !isActive(c)).map((c) => node(c, []))
    );
  }

  const snapshot = new TabGroupDirectorySnapshot(browserState.supergroups);
  // Containers with tabs in the window, and the groups they are in.
  const activeTabGroupIds = new Set<string>();
  for (const container of containers) {
    if (!(container.cookieStore.id in windowState.unpinnedTabIdsByContainer)) continue;
    let tabGroupId: string | undefined = container.cookieStore.id;
    while (tabGroupId != null && !activeTabGroupIds.has(tabGroupId)) {
      activeTabGroupIds.add(tabGroupId);
      tabGroupId = snapshot.getParentTabGroupId(tabGroupId);
    }
  }

  const memberNodes = (tabGroupIds: string[]): WindowContainerNode[] =>
    tabGroupIds.flatMap((tabGroupId): WindowContainerNode[] => {
      if (new TabGroupAttributes(tabGroupId).tabGroupType == 'cookieStore') {
        const container = containers.find((c) => c.cookieStore.id == tabGroupId);
        if (!container) return [];
        const tabs = tabsOf(tabGroupId);
        return [node(container, tabs, tabs.length > 0)];
      }
      const supergroup = snapshot.getSupergroup(tabGroupId) as SupergroupType;
      const members = memberNodes(supergroup.members);
      // Unlike a container, a group counts index tabs too (as before).
      const tabCount = members.reduce(
        (sum, m) => sum + (m.type == 'container' ? tabsOf(m.container.cookieStore.id).length : m.tabCount),
        0
      );
      return [{ type: 'supergroup', tabGroupId, supergroup, tabCount, members }];
    });

  const rootMembers = (snapshot.getSupergroup(TabGroupAttributes.getRootSupergroupTabGroupId()) as SupergroupType)
    .members;
  return summary(
    memberNodes(rootMembers.filter((id) => activeTabGroupIds.has(id))),
    memberNodes(rootMembers.filter((id) => !activeTabGroupIds.has(id)))
  );
};

export type SearchResults = {
  containers: { container: DisplayedContainer; tabCount: number }[];
  tabs: TabWithContainer[];
};

/**
 * Containers whose names contain every word, and the window's tabs whose title or URL contains
 * every word. Words are separated by spaces and ignore case.
 */
export const getSearchResults = (browserState: BrowserStateDao, windowId: number, search: string): SearchResults => {
  const windowState = browserState.windows[windowId] as WindowStateDao;
  const containers = getWindowContainers(browserState, windowState);
  const words = [...new Set(search.split(/\s+/u).map((word) => word.toLowerCase()))];
  const matches = (text: string) => words.every((word) => text.toLowerCase().includes(word));
  const tabs = Object.values(windowState.tabs)
    .map((dao) => TabDao.toCompatTab(dao))
    .filter((tab) =>
      words.every((word) => tab.title.toLowerCase().includes(word) || tab.url.toLowerCase().includes(word))
    )
    .sort((a, b) => a.index - b.index);
  return {
    containers: containers
      .filter((container) => matches(container.name))
      .map((container) => ({
        container,
        tabCount: (windowState.unpinnedTabIdsByContainer[container.cookieStore.id] ?? []).length,
      })),
    tabs: tabs.flatMap((tab) => {
      const container = containers.find((c) => c.cookieStore.id == tab.cookieStore.id);
      if (!container) {
        console.error('Could not find user context for tab', tab);
        return [];
      }
      return [{ tab, container }];
    }),
  };
};

/** What the Windows screen does. */
export type WindowsHandlers = {
  tabActions: TabActions;
  collapseAll(windowId: number): void;
  expandAll(windowId: number): void;
  closeWindow(windowId: number): void;
  createGroup(): void;
  createContainer(): void;
  createTemporaryContainer(): void;
  openTabInContainer(container: DisplayedContainer, windowId: number): void;
  closeContainer(container: DisplayedContainer, windowId: number): void;
  containerOptions(container: DisplayedContainer, isPrivate: boolean): void;
  hideContainer(container: DisplayedContainer, windowId: number): void;
  showContainer(container: DisplayedContainer, windowId: number): void;
  focusContainer(container: DisplayedContainer, windowId: number): void;
  reopenTabInContainer(tabId: number, container: DisplayedContainer): void;
  hideSupergroup(tabGroupId: string, windowId: number): void;
  showSupergroup(tabGroupId: string, windowId: number): void;
  closeSupergroup(tabGroupId: string, windowId: number): void;
  supergroupOptions(supergroup: SupergroupType): void;
};

type NodesProps = { nodes: WindowContainerNode[]; windowId: number; isPrivate: boolean; handlers: WindowsHandlers };

const ContainerNodes = ({ nodes, windowId, isPrivate, handlers: h }: NodesProps) =>
  nodes.map((node) => {
    if (node.type == 'supergroup') {
      const id = node.tabGroupId;
      return (
        <SupergroupRow
          key={id}
          name={node.supergroup.name}
          tabCount={node.tabCount}
          onClose={() => h.closeSupergroup(id, windowId)}
          onOptions={() => h.supergroupOptions(node.supergroup)}
          onHide={() => h.hideSupergroup(id, windowId)}
          onUnhide={() => h.showSupergroup(id, windowId)}
        >
          <ContainerNodes nodes={node.members} windowId={windowId} isPrivate={isPrivate} handlers={h} />
        </SupergroupRow>
      );
    }
    const c = node.container;
    return (
      <ContainerRow
        key={c.cookieStore.id}
        container={c}
        tabCount={node.tabCount}
        hidden={node.hidden}
        active={node.active}
        onClick={() => h.openTabInContainer(c, windowId)}
        onClose={() => h.closeContainer(c, windowId)}
        onOptions={() => h.containerOptions(c, isPrivate)}
        onHide={() => h.hideContainer(c, windowId)}
        onUnhide={() => h.showContainer(c, windowId)}
        onHighlight={node.open ? () => h.focusContainer(c, windowId) : undefined}
        onDropTab={(tabId) => h.reopenTabInContainer(tabId, c)}
      >
        {node.tabs.map((tab) => (
          <TabRow key={`tab-${tab.id}`} tab={tab} container={c} actions={h.tabActions} draggable />
        ))}
      </ContainerRow>
    );
  });

/** The "more containers" section, which remembers whether it is open. */
const MoreContainers = ({ children }: { children: ReactNode }) => {
  const option = config['menu.hideEmptyContainers'];
  const [initiallyOpen] = useState(() => !(option.tryGetValueSync() ?? false));
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    option
      .getValue()
      .then((hide) => {
        if (hide && ref.current) ref.current.open = false;
      })
      .catch((e) => console.error(e));
  }, [option]);
  return (
    <details
      ref={ref}
      className={styles.moreContainers}
      open={initiallyOpen}
      onToggle={(ev) => {
        const hidden = !ev.currentTarget.open;
        option
          .getValue()
          .then((value) => (value != hidden ? option.setValue(hidden) : undefined))
          .catch((e) => console.error(e));
      }}
    >
      <summary>{browser.i18n.getMessage('currentWindowMoreContainers')}</summary>
      <div>{children}</div>
    </details>
  );
};

type WindowsViewProps = {
  browserState: BrowserStateDao;
  handlers: WindowsHandlers;
  /** Shown: the search box takes focus each time this becomes true. */
  active: boolean;
  /** List the tabs of containers whose tab group is collapsed (#482). */
  listCollapsedTabs?: boolean;
};

/** Closing or moving a selected tab closes or moves all selected tabs; a plain click ends the selection (#386). */
const withSelection = (
  h: WindowsHandlers,
  selection: ReadonlySet<number>,
  setSelection: (selection: ReadonlySet<number>) => void
): WindowsHandlers => {
  const together = (tabId: number) => (selection.has(tabId) ? [...selection] : [tabId]);
  return {
    ...h,
    tabActions: {
      ...h.tabActions,
      activate: (tabId) => {
        setSelection(new Set());
        h.tabActions.activate(tabId);
      },
      close: (tabId) => {
        setSelection(new Set());
        for (const id of together(tabId)) h.tabActions.close(id);
      },
      toggleSelected: (tabId) => {
        const next = new Set(selection);
        if (!next.delete(tabId)) next.add(tabId);
        setSelection(next);
      },
      isSelected: (tabId) => selection.has(tabId),
    },
    reopenTabInContainer: (tabId, container) => {
      setSelection(new Set());
      for (const id of together(tabId)) h.reopenTabInContainer(id, container);
    },
  };
};

export const WindowsView = ({
  browserState,
  handlers: plainHandlers,
  active,
  listCollapsedTabs = false,
}: WindowsViewProps) => {
  const [selection, setSelection] = useState<ReadonlySet<number>>(new Set());
  const h = withSelection(plainHandlers, selection, setSelection);
  const [selectedWindowId, setSelectedWindowId] = useState(browserState.currentWindowId);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) searchRef.current?.focus();
  }, [active]);
  // A closed window falls back to the current one.
  const windowId = browserState.windowIds.includes(selectedWindowId) ? selectedWindowId : browserState.currentWindowId;
  if (windowId != selectedWindowId) setSelectedWindowId(windowId);

  const summary = getWindowSummary(browserState, windowId, listCollapsedTabs);
  const searchString = search.trim();
  const results = searchString ? getSearchResults(browserState, windowId, searchString) : null;
  const isPrivate = summary.isPrivate;
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerWindow}>
          <select
            className={styles.windowSelect}
            value={String(windowId)}
            onChange={(ev) => setSelectedWindowId(parseInt(ev.currentTarget.value))}
          >
            {browserState.windowIds.map((id) => (
              <option key={id} value={String(id)}>
                {browser.i18n.getMessage(
                  id == browserState.currentWindowId ? 'currentWindow' : 'windowLabel',
                  id.toFixed(0)
                )}
              </option>
            ))}
          </select>
          <span className={styles.tabCount}>{`(${summary.tabCount})`}</span>
          <MenuItem
            iconOnly
            icon="/img/firefox-icons/arrow-up.svg"
            label="tooltipCollapseContainers"
            onClick={() => h.collapseAll(windowId)}
          />
          <MenuItem
            iconOnly
            icon="/img/firefox-icons/arrow-down.svg"
            label="tooltipExpandContainers"
            onClick={() => h.expandAll(windowId)}
          />
          <MenuItem
            iconOnly
            icon="/img/firefox-icons/close.svg"
            label="tooltipCloseWindow"
            onClick={() => h.closeWindow(windowId)}
          />
        </div>
        <div className={styles.headerContainer}>
          <div className={styles.searchWrapper}>
            <input
              className={styles.search}
              type="search"
              placeholder={browser.i18n.getMessage('searchPlaceholder')}
              ref={searchRef}
              // onInput, unlike onChange, also sees a value set by script before an 'input' event.
              onInput={(ev) => setSearch(ev.currentTarget.value)}
              {...FOCUSABLE}
            />
          </div>
          <MenuItem
            iconOnly
            hidden={isPrivate}
            icon="/img/firefox-icons/folder-add.svg"
            label="buttonNewGroup"
            onClick={h.createGroup}
          />
          <MenuItem
            iconOnly
            icon="/img/firefox-icons/plus.svg"
            label="buttonNewContainer"
            onClick={h.createContainer}
          />
          <MenuItem
            iconOnly
            icon="/img/firefox-icons/history.svg"
            label="buttonNewTemporaryContainer"
            onClick={h.createTemporaryContainer}
          />
        </div>
      </div>
      <div hidden={results != null}>
        <div>
          {summary.pinnedTabs.map(({ tab, container }) => (
            <TabRow key={tab.id} tab={tab} container={container} actions={h.tabActions} draggable />
          ))}
        </div>
        <div>
          <ContainerNodes nodes={summary.openContainers} windowId={windowId} isPrivate={isPrivate} handlers={h} />
        </div>
        <MoreContainers>
          <ContainerNodes nodes={summary.inactiveContainers} windowId={windowId} isPrivate={isPrivate} handlers={h} />
        </MoreContainers>
        <div className={styles.actions}>
          <MenuItem icon="/img/firefox-icons/plus.svg" label="buttonNewContainer" onClick={h.createContainer} />
          <MenuItem
            icon="/img/firefox-icons/history.svg"
            label="buttonNewTemporaryContainer"
            onClick={h.createTemporaryContainer}
          />
        </div>
      </div>
      <div hidden={results == null}>
        <div className={styles.searchResultsContainers}>
          {results?.containers.map(({ container: c, tabCount }) => (
            <ContainerRow
              key={c.cookieStore.id}
              container={c}
              tabCount={tabCount}
              onClick={() => h.openTabInContainer(c, windowId)}
              onClose={() => h.closeContainer(c, windowId)}
              onOptions={() => h.containerOptions(c, isPrivate)}
              onDropTab={(tabId) => h.reopenTabInContainer(tabId, c)}
            />
          ))}
        </div>
        <div>
          {results?.tabs.map(({ tab, container }) => (
            <TabRow key={tab.id} tab={tab} container={container} actions={h.tabActions} />
          ))}
        </div>
      </div>
    </>
  );
};
