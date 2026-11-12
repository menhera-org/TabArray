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

import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';

import { render } from '../../test/render';
import { ConfirmDialog, MenuDialog, NameDialog, cleanName, getMoveTargets } from './dialogs';
import { getColors, pickerColor, ContainerEditorDialog } from './ContainerEditorDialog';
import { showDialog } from './showDialog';

const buttons = (root: Element) => [...root.querySelectorAll('button')];
const typeInto = (input: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

test('ConfirmDialog offers Cancel and a default OK', () => {
  const onOk = vi.fn();
  const onCancel = vi.fn();
  const { container: root, click } = render(<ConfirmDialog title="Sure?" onOk={onOk} onCancel={onCancel} />);
  expect(root.querySelector('h2')?.textContent).toBe('Sure?');
  expect(buttons(root).map((b) => b.textContent)).toEqual(['buttonCancel', 'buttonOk']);
  click(buttons(root)[1] ?? null);
  click(buttons(root)[0] ?? null);
  expect([onOk.mock.calls.length, onCancel.mock.calls.length]).toEqual([1, 1]);
});

test('a dialog is modal, takes focus, cancels on Escape and gives focus back when it goes away', () => {
  const before = document.body.appendChild(document.createElement('button'));
  before.focus();
  const onCancel = vi.fn();
  const { container: root, rerender } = render(<ConfirmDialog title="Sure?" onOk={() => {}} onCancel={onCancel} />);
  const dialog = root.querySelector('dialog') as HTMLDialogElement;
  // Firefox's showModal() also focuses the first control; happy-dom's does not, so that is checked in Firefox.
  expect(dialog.open).toBe(true);
  act(() => {
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  });
  expect(onCancel).toHaveBeenCalled();
  rerender(null);
  expect(document.activeElement).toBe(before);
  before.remove();
});

test('Enter in the name field means OK', async () => {
  const onSave = vi.fn(async () => {});
  const { container: root } = render(<NameDialog title="T" onSave={onSave} onClose={() => {}} />);
  const input = root.querySelector('input') as HTMLInputElement;
  typeInto(input, 'Name');
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  expect(onSave).toHaveBeenCalledWith('Name');
});

test('MenuDialog reports the chosen action', () => {
  const onAction = vi.fn();
  const { container: root, click } = render(
    <MenuDialog
      title="T"
      actions={[
        { id: 'a', label: 'A' },
        { id: 'done', label: 'Done', isDefault: true },
      ]}
      onAction={onAction}
    />
  );
  click(buttons(root)[0] ?? null);
  expect(onAction).toHaveBeenCalledWith('a');
});

describe('NameDialog', () => {
  test('saves the cleaned name and closes, but ignores an empty one', async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    const { container: root, click } = render(<NameDialog title="T" onSave={onSave} onClose={onClose} />);
    const input = root.querySelector('input') as HTMLInputElement;
    typeInto(input, '   ');
    click(buttons(root)[1] ?? null);
    expect(onSave).not.toHaveBeenCalled();
    typeInto(input, '  Name ');
    await act(async () => buttons(root)[1]?.click());
    expect(onSave).toHaveBeenCalledWith('Name');
    expect(onClose).toHaveBeenCalled();
  });

  test('cleanName trims all surrounding white space', () => {
    expect(cleanName('　 a b \n')).toBe('a b');
  });
});

test('getMoveTargets leaves out the group itself and the groups inside it', () => {
  const snapshot = new TabGroupDirectorySnapshot({
    'tabarray-supergroup-0': { supergroupId: 0, name: '', members: ['tabarray-supergroup-1', 'tabarray-supergroup-3'] },
    'tabarray-supergroup-1': { supergroupId: 1, name: 'A', members: ['tabarray-supergroup-2'] },
    'tabarray-supergroup-2': { supergroupId: 2, name: 'B', members: [] },
    'tabarray-supergroup-3': { supergroupId: 3, name: 'C', members: [] },
  });
  expect(getMoveTargets(snapshot, 'tabarray-supergroup-1')).toEqual([
    ['tabarray-supergroup-0', 'rootGroup'],
    ['tabarray-supergroup-3', 'C'],
  ]);
});

describe('container colors', () => {
  test('violet is offered only where Firefox supports it', () => {
    expect(getColors(false)).not.toContain('violet');
    expect(getColors(true)).toContain('violet');
  });

  test('newer color names map to offered ones, and unknown ones to the first', () => {
    const colors = getColors(false);
    expect(pickerColor('gray', colors)).toBe('toolbar');
    expect(pickerColor('red', colors)).toBe('red');
    expect(pickerColor('no-such-color', colors)).toBe('blue');
    // The test browser predates Firefox 153, so violet falls back to purple.
    expect(pickerColor('violet', colors)).toBe('purple');
  });
});

test('ContainerEditorDialog edits an existing container without the cookie copy row', () => {
  const identity = {
    name: 'Work',
    icon: 'briefcase',
    color: 'gray',
    cookieStore: { id: 'firefox-container-1' },
  } as unknown as Parameters<typeof ContainerEditorDialog>[0]['contextualIdentity'];
  const { container: root } = render(<ContainerEditorDialog contextualIdentity={identity} onClose={() => {}} />);
  expect(root.querySelector('h2')?.textContent).toBe('editContainerDialogTitle');
  expect((root.querySelector('input[type=text]') as HTMLInputElement).value).toBe('Work');
  expect((root.querySelector('#icon-briefcase') as HTMLInputElement).checked).toBe(true);
  expect((root.querySelector('#color-toolbar') as HTMLInputElement).checked).toBe(true);
  expect(root.querySelector<HTMLElement>('p:has(#cookie-copy-checkbox)')?.hidden).toBe(true);
});

test('showDialog adds a dialog to the page and removes it when closed', () => {
  const count = () => document.querySelectorAll('h2[data-test-title]').length;
  let close = () => {};
  act(() => {
    close = showDialog(() => <h2 data-test-title />);
  });
  expect(count()).toBe(1);
  act(() => close());
  expect(count()).toBe(0);
});
