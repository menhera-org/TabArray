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

import { dragAndDrop, render } from '../../../test/render';
import { compatTab, container } from '../../../test/fixtures';
import { TabRow } from './TabRow';
import { getFocusableElements } from './focus';

const actions = () => ({
  activate: vi.fn(),
  close: vi.fn(),
  setPinned: vi.fn(),
  setTag: vi.fn(),
  showContextMenu: vi.fn(),
  move: vi.fn(),
});

describe('TabRow', () => {
  test('runs the action of each button', () => {
    const a = actions();
    const { container: root, click } = render(
      <TabRow tab={compatTab(7, { pinned: true })} container={container('firefox-container-1', 'Work')} actions={a} />
    );
    click(getFocusableElements(root)[0] ?? null);
    expect(a.activate).toHaveBeenCalledWith(7);
    click(root.querySelector('[title="tooltipTabUnpinButton"]'));
    expect(a.setPinned).toHaveBeenCalledWith(7, false);
    click(root.querySelector('[title="setTag"]'));
    expect(a.setTag).toHaveBeenCalledWith(7);
    click(root.querySelector('[title="buttonTabClose"]'));
    expect(a.close).toHaveBeenCalledWith(7);
  });

  test('closes on middle click and asks for the tab context menu', () => {
    const a = actions();
    const { container: root } = render(
      <TabRow tab={compatTab(7)} container={container('firefox-container-1', 'Work')} actions={a} />
    );
    const title = root.querySelector('button span:last-child') as HTMLElement;
    act(() => {
      title.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 2 }));
      title.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }));
    });
    expect(a.close).not.toHaveBeenCalled();
    expect(a.showContextMenu).toHaveBeenCalledWith(7);
    act(() => {
      title.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    });
    expect(a.close).toHaveBeenCalledWith(7);
  });

  test('reorders by drag and drop within the pinned tabs or within one container', () => {
    const a = actions();
    const work = container('firefox-container-1', 'Work');
    const { container: root } = render(
      <>
        <TabRow tab={compatTab(1, { index: 3, pinned: true })} container={work} actions={a} draggable />
        <TabRow tab={compatTab(2, { index: 0, pinned: true })} container={work} actions={a} draggable />
        <TabRow tab={compatTab(3, { index: 5 })} container={work} actions={a} draggable />
        <TabRow tab={compatTab(4, { index: 6 })} container={work} actions={a} draggable />
        <TabRow
          tab={compatTab(5, { index: 7 })}
          container={container('firefox-default', 'Default')}
          actions={a}
          draggable
        />
      </>
    );
    const rows = [...root.children];
    expect(rows.every((row) => row.getAttribute('draggable') == 'true')).toBe(true);
    expect(dragAndDrop(rows[0]!, rows[1]!)).toBe(true);
    expect(a.move).toHaveBeenLastCalledWith(1, 0);
    expect(dragAndDrop(rows[3]!, rows[2]!)).toBe(true);
    expect(a.move).toHaveBeenLastCalledWith(4, 5);
    // Pinned onto unpinned, and across containers, are not reorders.
    expect(dragAndDrop(rows[0]!, rows[2]!)).toBe(false);
    expect(dragAndDrop(rows[4]!, rows[2]!)).toBe(false);
    expect(a.move).toHaveBeenCalledTimes(2);
  });

  test('is not draggable unless asked', () => {
    const { container: root } = render(
      <TabRow tab={compatTab(7)} container={container('firefox-container-1', 'Work')} actions={actions()} />
    );
    expect(root.firstElementChild?.hasAttribute('draggable')).toBe(false);
  });

  test('shows the title and URL, and colors the row except for the default container', () => {
    const tab = compatTab(7, { title: 'Hello', url: 'https://hello.example/' });
    const { container: root } = render(
      <>
        <TabRow tab={tab} container={container('firefox-container-1', 'Work')} actions={actions()} />
        <TabRow tab={tab} container={container('firefox-default', 'Default')} actions={actions()} />
      </>
    );
    const buttons = getFocusableElements(root);
    expect(buttons[0]?.title).toBe('https://hello.example/');
    expect(buttons[0]?.textContent).toBe('Hello');
    expect(buttons.map((b) => b.parentElement?.style.borderColor)).toEqual(['#37adff', '']);
  });
});
