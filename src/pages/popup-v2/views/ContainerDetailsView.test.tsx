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
import { browserState, container, tabDao } from '../../../test/fixtures';
import { ContainerDetailsView, getContainerTabsByWindow } from './ContainerDetailsView';
import { getFocusableElements } from './focus';

const work = 'firefox-container-1';
const state = browserState({
  currentWindowId: 2,
  tabs: {
    1: tabDao(1, { cookieStoreId: work, windowId: 1 }),
    2: tabDao(2, { cookieStoreId: work, windowId: 2 }),
    3: tabDao(3, { cookieStoreId: work, windowId: 2, url: IndexTab.getUrl('Work', '', '#000', '').url }),
    4: tabDao(4, { cookieStoreId: work, windowId: 2 }),
    5: tabDao(5, { cookieStoreId: work, windowId: 1 }),
  },
  tabIdsByContainer: { [work]: [1, 2, 3, 4, 5] },
});

describe('getContainerTabsByWindow', () => {
  test('splits the tabs into runs of one window and leaves out index tabs', () => {
    const runs = getContainerTabsByWindow(state, work).map((run) => [
      run.windowId,
      run.isCurrentWindow,
      run.tabs.map((t) => t.id),
    ]);
    expect(runs).toEqual([
      [1, false, [1]],
      [2, true, [2, 4]],
      [1, false, [5]],
    ]);
  });

  test('is empty for a container without tabs', () => {
    expect(getContainerTabsByWindow(state, 'firefox-container-9')).toEqual([]);
  });
});

test('ContainerDetailsView labels each window and lists its tabs', () => {
  const activate = vi.fn();
  const { container: root, click } = render(
    <ContainerDetailsView
      container={container(work, 'Work')}
      windows={getContainerTabsByWindow(state, work)}
      tabActions={{
        activate,
        close: vi.fn(),
        setPinned: vi.fn(),
        showContextMenu: vi.fn(),
        move: vi.fn(),
      }}
    />
  );
  expect([...root.children].map((e) => e.textContent)).toEqual([
    'windowLabel(1)',
    'Tab 1',
    'currentWindow(2)',
    'Tab 2',
    'Tab 4',
    'windowLabel(1)',
    'Tab 5',
  ]);
  click(getFocusableElements(root)[2] ?? null);
  expect(activate).toHaveBeenCalledWith(4);
});
