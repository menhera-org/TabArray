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
import { ContainerNode, ContainersView, getContainerTree } from './ContainersView';
import { getFocusableElements } from './focus';

const indexUrl = IndexTab.getUrl('Work', '', '#000', '').url;

const state = browserState({
  displayedContainers: [
    containerDao('firefox-container-1', 'Work'),
    containerDao('firefox-container-2', 'Shopping'),
    containerDao('firefox-container-3', 'Unlisted'),
    containerDao('firefox-private', 'Private'),
  ],
  supergroups: {
    'tabarray-supergroup-0': {
      supergroupId: 0,
      name: '',
      members: ['tabarray-supergroup-1', 'firefox-container-2', 'firefox-gone'],
    },
    'tabarray-supergroup-1': { supergroupId: 1, name: 'Jobs', members: ['firefox-container-1'] },
  },
  tabs: {
    1: tabDao(1, { cookieStoreId: 'firefox-container-1' }),
    2: tabDao(2, { cookieStoreId: 'firefox-container-1' }),
    3: tabDao(3, { cookieStoreId: 'firefox-container-2', url: indexUrl }),
    4: tabDao(4, { cookieStoreId: 'firefox-private', url: indexUrl }),
  },
  tabIdsByContainer: { 'firefox-container-1': [1, 2], 'firefox-container-2': [3], 'firefox-private': [4] },
});

const summary = (nodes: ContainerNode[]): unknown[] =>
  nodes.map((node) =>
    node.type == 'container'
      ? [node.container.name, node.tabCount, node.dimmed]
      : [node.supergroup.name, node.tabCount, summary(node.members)]
  );

describe('getContainerTree', () => {
  test('puts private browsing first and follows the group tree', () => {
    expect(summary(getContainerTree(state))).toEqual([
      // Index tabs count in private browsing only, as before.
      ['Private', 1, false],
      ['Jobs', 2, [['Work', 2, false]]],
      ['Shopping', 0, true],
    ]);
  });
});

describe('ContainersView', () => {
  const callbacks = () => ({
    onContainerClick: vi.fn(),
    onContainerClose: vi.fn(),
    onContainerOptions: vi.fn(),
    onSupergroupClose: vi.fn(),
    onSupergroupOptions: vi.fn(),
  });

  test('shows names and counts, and close buttons only where there are tabs', () => {
    const { container } = render(<ContainersView nodes={getContainerTree(state)} {...callbacks()} />);
    const counted = [...container.querySelectorAll('[data-tab-count]')];
    expect(counted.map((e) => [e.textContent, e.getAttribute('data-tab-count')])).toEqual([
      ['privateBrowsing', '1'],
      ['Jobs', '2'],
      ['Work', '2'],
      ['Shopping', '0'],
    ]);
    expect(container.querySelectorAll('[title="tooltipContainerCloseAll"]')).toHaveLength(3);
    // Only containers, not groups, take part in arrow-key focus.
    expect(getFocusableElements(container)).toHaveLength(3);
  });

  test('reports clicks with the container or group', () => {
    const cb = callbacks();
    const { container, click } = render(<ContainersView nodes={getContainerTree(state)} {...cb} />);
    click(getFocusableElements(container)[1] ?? null);
    expect(cb.onContainerClick.mock.calls[0]?.[0].cookieStore.id).toBe('firefox-container-1');
    click(container.querySelector('[title="containerOptions(Shopping)"]'));
    expect(cb.onContainerOptions.mock.calls[0]?.[0].name).toBe('Shopping');
    click(container.querySelector('[title="groupOptions(Jobs)"]'));
    expect(cb.onSupergroupOptions.mock.calls[0]?.[0].supergroupId).toBe(1);
    const closeButtons = container.querySelectorAll('[title="tooltipContainerCloseAll"]');
    click(closeButtons[1] ?? null);
    expect(cb.onSupergroupClose).toHaveBeenCalledWith('tabarray-supergroup-1');
    click(closeButtons[2] ?? null);
    expect(cb.onContainerClose.mock.calls[0]?.[0].name).toBe('Work');
  });

  test('renders nothing without containers', () => {
    const { container } = render(<ContainersView nodes={[]} {...callbacks()} />);
    expect(container.innerHTML).toBe('');
  });
});
