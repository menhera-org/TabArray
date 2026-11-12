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
import { expect, test, vi } from 'vitest';

import { render } from '../../test/render';
import { compatTab, container } from '../../test/fixtures';
import { PanoramaTab, tabIcon, tabLabel } from './PanoramaTab';
import { sortByTabs } from './PanoramaApp';

const info = { id: 7, url: 'https://a.example/', title: '', favIconUrl: '', previewUrl: '' };

test('tabs show their URL without a title, and extension pages the extension icon', () => {
  expect(tabLabel(info)).toBe('https://a.example/');
  expect(tabLabel({ ...info, title: 'T' })).toBe('T');
  expect(tabIcon(info)).toBe('/img/transparent.png');
  expect(tabIcon({ ...info, url: 'about:addons' })).toBe('/img/firefox-icons/extension.svg');
  expect(tabIcon({ ...info, favIconUrl: 'https://a.example/i.ico' })).toBe('https://a.example/i.ico');
});

test('containers with tabs come first, in order', () => {
  const entry = (name: string, tabs: number) => ({
    container: container(`firefox-container-${name}`, name),
    tabs: Array.from({ length: tabs }, (_, i) => compatTab(i)),
  });
  expect(sortByTabs([entry('a', 0), entry('b', 1), entry('c', 0), entry('d', 2)]).map((e) => e.container.name)).toEqual(
    ['b', 'd', 'a', 'c']
  );
});

test('a tab card activates, closes without activating, and carries its id when dragged', () => {
  const onActivate = vi.fn();
  const onClose = vi.fn();
  const onContextMenu = vi.fn();
  const { container: root, click } = render(
    <PanoramaTab
      tab={{ ...info, title: 'T' }}
      onActivate={onActivate}
      onClose={onClose}
      onContextMenu={onContextMenu}
    />
  );
  const card = root.firstElementChild as HTMLElement;
  expect([card.getAttribute('draggable'), card.title]).toEqual(['true', 'https://a.example/']);
  click(root.querySelector('button[title="buttonTabClose"]'));
  expect([onClose.mock.calls.length, onActivate.mock.calls.length]).toEqual([1, 0]);
  click(root.querySelector('button'));
  expect(onActivate).toHaveBeenCalledTimes(1);
  const data = new Map<string, string>();
  const dragStart = new Event('dragstart', { bubbles: true });
  Object.defineProperty(dragStart, 'dataTransfer', {
    value: { setData: (k: string, v: string) => data.set(k, v), dropEffect: 'none' },
  });
  act(() => {
    card.dispatchEvent(dragStart);
    card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  });
  expect(JSON.parse(data.get('application/json') ?? '')).toEqual({ id: 7 });
  expect(onContextMenu).toHaveBeenCalled();
});
