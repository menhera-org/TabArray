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

import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { TabDao } from '../../../lib/states/TabDao';
import { IndexTab } from '../../../legacy-lib/modules/IndexTab';

import { dragAndDrop, render } from '../../../test/render';
import { browserState, containerDao, tabDao } from '../../../test/fixtures';
import { WindowContainerNode, WindowsHandlers, WindowsView, getSearchResults, getWindowSummary } from './WindowsView';
import { getFocusableElements } from './focus';

const work = 'firefox-container-1';
const tabs: TabDao[] = [
  tabDao(1, { index: 0, pinned: true }),
  tabDao(2, { index: 1, pinned: true, cookieStoreId: work }),
  tabDao(3, { index: 2, cookieStoreId: work }),
  tabDao(4, { index: 3, cookieStoreId: work }),
  tabDao(5, { index: 4, cookieStoreId: work, url: IndexTab.getUrl('Work', '', '#000', '').url }),
  tabDao(6, { index: 5, hidden: true }),
];
const privateTab = tabDao(10, { index: 0, cookieStoreId: 'firefox-private' });

const state = browserState({
  currentWindowId: 1,
  windowIds: [1, 2],
  displayedContainers: [
    containerDao('firefox-default', 'No Container'),
    containerDao(work, 'Work'),
    containerDao('firefox-container-2', 'Shopping'),
    containerDao('firefox-container-3', 'Bank'),
    containerDao('firefox-private', 'Private'),
  ],
  supergroups: {
    'tabarray-supergroup-0': {
      supergroupId: 0,
      name: '',
      members: ['firefox-default', 'tabarray-supergroup-1', 'firefox-container-3'],
    },
    'tabarray-supergroup-1': { supergroupId: 1, name: 'Jobs', members: [work, 'firefox-container-2'] },
  },
  tags: { 7: { tagId: 7, name: 'Urgent' } },
  tagIdsForTabs: { 3: 7 },
  windows: {
    1: {
      id: 1,
      isPrivate: false,
      tabs: Object.fromEntries(tabs.map((t) => [t.id, t])),
      activeTabIds: [],
      pinnedTabIds: [2, 1],
      activeContainers: [work, 'firefox-default'],
      unpinnedTabIdsByContainer: { [work]: [3, 4, 5], 'firefox-default': [6] },
    },
    2: {
      id: 2,
      isPrivate: true,
      tabs: { 10: privateTab },
      activeTabIds: [],
      pinnedTabIds: [],
      activeContainers: ['firefox-private'],
      unpinnedTabIdsByContainer: { 'firefox-private': [10] },
    },
  },
});

const outline = (nodes: WindowContainerNode[]): unknown[] =>
  nodes.map((node) =>
    node.type == 'container'
      ? [
          node.container.name,
          node.tabCount,
          { hidden: node.hidden, open: node.open },
          node.items.map((item) => (item.type == 'tag' ? `#${item.tag.name}` : item.tab.id)),
        ]
      : [node.supergroup.name, node.tabCount, outline(node.members)]
  );

describe('getWindowSummary', () => {
  test('lists pinned tabs, then containers with tabs (with their groups), then the rest', () => {
    const summary = getWindowSummary(state, 1);
    expect(summary.tabCount).toBe(6);
    expect(summary.pinnedTabs.map((p) => [p.tab.id, p.container.name])).toEqual([
      [1, 'No Container'],
      [2, 'Work'],
    ]);
    expect(outline(summary.openContainers)).toEqual([
      ['No Container', 1, { hidden: true, open: true }, []],
      [
        'Jobs',
        // A group counts the index tab too, as before.
        3,
        [
          // Tabs are sorted by tag, with a heading where the tag changes; the index tab is left out.
          ['Work', 2, { hidden: false, open: true }, [4, '#Urgent', 3]],
          ['Shopping', 0, { hidden: false, open: false }, []],
        ],
      ],
    ]);
    expect(outline(summary.inactiveContainers)).toEqual([['Bank', 0, { hidden: false, open: false }, []]]);
  });

  test('shows only private browsing in a private window', () => {
    const summary = getWindowSummary(state, 2);
    expect(summary.isPrivate).toBe(true);
    expect(outline(summary.openContainers)).toEqual([['Private', 1, { hidden: false, open: true }, [10]]]);
    expect(summary.inactiveContainers).toEqual([]);
  });
});

describe('getSearchResults', () => {
  const ids = (search: string) => {
    const results = getSearchResults(state, 1, search);
    return [results.containers.map((c) => [c.container.name, c.tabCount]), results.tabs.map((t) => t.tab.id)];
  };

  test('matches every word in titles, URLs and tag names, ignoring case', () => {
    expect(ids('URGENT')).toEqual([[], [3]]);
    expect(ids('tab 4')).toEqual([[], [4]]);
    expect(ids('example.com/1')).toEqual([[], [1]]);
  });

  test('matches container names and counts their unpinned tabs in the window', () => {
    expect(ids('shop')).toEqual([[['Shopping', 0]], []]);
    // The index tab's URL carries the container name, so it matches too.
    expect(ids('wor')).toEqual([[['Work', 3]], [5]]);
  });

  test('focuses the search box whenever the screen becomes active', () => {
    const { container: root, rerender } = render(
      <WindowsView browserState={state} handlers={handlers()} active={false} />
    );
    const search = getFocusableElements(root)[0];
    expect(document.activeElement).not.toBe(search);
    rerender(<WindowsView browserState={state} handlers={handlers()} active={true} />);
    expect(document.activeElement).toBe(search);
  });
});

const handlers = (): WindowsHandlers => ({
  tabActions: {
    activate: vi.fn(),
    close: vi.fn(),
    setPinned: vi.fn(),
    setTag: vi.fn(),
    showContextMenu: vi.fn(),
    move: vi.fn(),
  },
  collapseAll: vi.fn(),
  expandAll: vi.fn(),
  closeWindow: vi.fn(),
  createTag: vi.fn(),
  createGroup: vi.fn(),
  createContainer: vi.fn(),
  createTemporaryContainer: vi.fn(),
  openTabInContainer: vi.fn(),
  closeContainer: vi.fn(),
  containerOptions: vi.fn(),
  hideContainer: vi.fn(),
  showContainer: vi.fn(),
  focusContainer: vi.fn(),
  reopenTabInContainer: vi.fn(),
  editTag: vi.fn(),
  deleteTag: vi.fn(),
  hideSupergroup: vi.fn(),
  showSupergroup: vi.fn(),
  closeSupergroup: vi.fn(),
  supergroupOptions: vi.fn(),
});

const named = (calls: unknown[][]) => calls.map(([c, ...rest]) => [(c as { name: string }).name, ...rest]);

describe('WindowsView', () => {
  test('shows the window header and runs the header buttons', () => {
    const h = handlers();
    const { container: root, click } = render(<WindowsView browserState={state} handlers={h} active={false} />);
    const select = root.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['currentWindow(1)', 'windowLabel(2)']);
    expect(select.value).toBe('1');
    expect(root.textContent).toContain('(6)');
    click(root.querySelector('ctg-menu-item[title="tooltipCloseWindow"]'));
    expect(h.closeWindow).toHaveBeenCalledWith(1);
    click(root.querySelector('ctg-menu-item[title="tooltipCollapseContainers"]'));
    expect(h.collapseAll).toHaveBeenCalledWith(1);
    expect((root.querySelector('ctg-menu-item[title="buttonNewGroup"]') as HTMLElement).hidden).toBe(false);
  });

  test('switches windows with the select', () => {
    const { container: root } = render(<WindowsView browserState={state} handlers={handlers()} active={false} />);
    const select = root.querySelector('select') as HTMLSelectElement;
    act(() => {
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(root.textContent).toContain('(1)');
    expect((root.querySelector('ctg-menu-item[title="buttonNewGroup"]') as HTMLElement).hidden).toBe(true);
  });

  test('hides, shows, focuses and opens containers', () => {
    const h = handlers();
    const { container: root, click } = render(<WindowsView browserState={state} handlers={h} active={false} />);
    // No Container's only tab is hidden, so its toggle and its name show it again.
    click(root.querySelector('[title="tooltipUnhideContainerButton"]'));
    click(root.querySelector('[title="defaultContainerName(0)"]'));
    expect(named(vi.mocked(h.showContainer).mock.calls)).toEqual([
      ['No Container', 1],
      ['No Container', 1],
    ]);
    click(root.querySelector('[title="tooltipHideContainerButton"]'));
    expect(named(vi.mocked(h.hideContainer).mock.calls)).toEqual([['Work', 1]]);
    const highlights = root.querySelectorAll('[title="focusToThisContainer"]');
    expect(highlights).toHaveLength(2);
    click(highlights[1] ?? null);
    expect(named(vi.mocked(h.focusContainer).mock.calls)).toEqual([['Work', 1]]);
    click(root.querySelector('[title="defaultContainerName(3)"]'));
    expect(named(vi.mocked(h.openTabInContainer).mock.calls)).toEqual([['Bank', 1]]);
    click(root.querySelector('[title="tooltipCollapseContainers"]:not(ctg-menu-item)'));
    expect(h.hideSupergroup).toHaveBeenCalledWith('tabarray-supergroup-1', 1);
  });

  test('opens a tab with a tag from its heading', () => {
    const h = handlers();
    const { container: root, click } = render(<WindowsView browserState={state} handlers={h} active={false} />);
    const tagButton = [...root.querySelectorAll('button')].find((b) => b.textContent == 'Urgent') ?? null;
    click(tagButton);
    expect(named(vi.mocked(h.openTabInContainer).mock.calls)).toEqual([['Work', 1, 7]]);
    click(root.querySelector('[title="buttonEditTag"]'));
    expect(h.editTag).toHaveBeenCalledWith({ tagId: 7, name: 'Urgent' });
  });

  test('moves a tab to another container by dropping it on the container', () => {
    const h = handlers();
    const { container: root } = render(<WindowsView browserState={state} handlers={h} active={false} />);
    const tab4 = [...root.querySelectorAll('[draggable="true"]')].find((row) => row.textContent == 'Tab 4');
    const bank = root.querySelector('[title="defaultContainerName(3)"]');
    expect(dragAndDrop(tab4!, bank!)).toBe(true);
    expect(named(vi.mocked(h.reopenTabInContainer).mock.calls.map(([tabId, c]) => [c, tabId]))).toEqual([['Bank', 4]]);
  });

  test('shows search results instead of the window while the search box has words', () => {
    const { container: root } = render(<WindowsView browserState={state} handlers={handlers()} active={false} />);
    const search = getFocusableElements(root)[0] as HTMLInputElement;
    expect(search.type).toBe('search');
    const [main, results] = [...root.children].slice(1) as HTMLElement[];
    expect([main?.hidden, results?.hidden]).toEqual([false, true]);
    act(() => {
      search.value = '  urgent ';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect([main?.hidden, results?.hidden]).toEqual([true, false]);
    expect(results?.textContent).toBe('Tab 3');
  });
});
