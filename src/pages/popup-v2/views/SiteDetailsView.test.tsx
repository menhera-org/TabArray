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

import { describe, expect, test, vi } from 'vitest';

import { IndexTab } from '../../../lib/tabs/IndexTab';

import { render } from '../../../test/render';
import { browserState, containerDao, tabDao } from '../../../test/fixtures';
import { SiteDetailsView, getSiteTabs, getSiteTabsByContainer } from './SiteDetailsView';
import { getFocusableElements } from './focus';

const state = browserState({
  displayedContainers: [containerDao('firefox-default', 'No Container'), containerDao('firefox-container-1', 'Work')],
  tabs: {
    1: tabDao(1, { cookieStoreId: 'firefox-container-1', windowId: 2, index: 0 }),
    2: tabDao(2, { cookieStoreId: 'firefox-default', windowId: 1, index: 5 }),
    3: tabDao(3, { cookieStoreId: 'firefox-container-1', windowId: 1, index: 3 }),
    4: tabDao(4, { cookieStoreId: 'firefox-container-9', windowId: 1, index: 4 }),
    5: tabDao(5, { cookieStoreId: 'firefox-default', url: IndexTab.getUrl('Work', '', '#000', '').url }),
  },
  tabIdsBySite: { 'example.com': [1, 2, 3, 4, 5] },
});

describe('getSiteTabsByContainer', () => {
  test('groups by container in order of appearance and sorts by window and position', () => {
    const groups = getSiteTabsByContainer(state, 'example.com').map((g) => [g.container.name, g.tabs.map((t) => t.id)]);
    expect(groups).toEqual([
      ['Work', [3, 1]],
      ['No Container', [2]],
    ]);
  });

  test('counts every tab of the site except index tabs', () => {
    expect(getSiteTabs(state, 'example.com')).toHaveLength(4);
    expect(getSiteTabs(state, 'nowhere.example')).toEqual([]);
  });
});

test('SiteDetailsView shows each container with its tabs', () => {
  const onContainerClose = vi.fn();
  const onContainerOptions = vi.fn();
  const activate = vi.fn();
  const { container: root, click } = render(
    <SiteDetailsView
      containers={getSiteTabsByContainer(state, 'example.com')}
      tabActions={{
        activate,
        close: vi.fn(),
        setPinned: vi.fn(),
        setTag: vi.fn(),
        showContextMenu: vi.fn(),
        move: vi.fn(),
      }}
      onContainerClose={onContainerClose}
      onContainerOptions={onContainerOptions}
    />
  );
  const counted = [...root.querySelectorAll('[data-tab-count]')];
  expect(counted.map((e) => [e.textContent, e.getAttribute('data-tab-count')])).toEqual([
    ['Work', '2'],
    ['No Container', '1'],
  ]);
  // Containers and tabs, in screen order.
  const focusable = getFocusableElements(root);
  expect(focusable.map((e) => e.textContent)).toEqual(['Work', 'Tab 3', 'Tab 1', 'No Container', 'Tab 2']);
  click(focusable[2] ?? null);
  expect(activate).toHaveBeenCalledWith(1);
  click(root.querySelector('[title="tooltipContainerCloseAll"]'));
  expect(onContainerClose.mock.calls[0]?.[0].name).toBe('Work');
  click(root.querySelector('[title="containerOptions(No Container)"]'));
  expect(onContainerOptions.mock.calls[0]?.[0].name).toBe('No Container');
});
