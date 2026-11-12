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
import { EventSink } from 'weeg-events';

import { ConfigurationOption } from '../../lib/config/ConfigurationOption';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { ProxyType } from '../../lib/proxies/ProxyType';

import { render } from '../../test/render';
import { container } from '../../test/fixtures';
import { CheckboxSetting, SelectSetting } from './settings';
import { getListingRows } from './TabGroupListing';
import { EMPTY_FORM, formFromPreset, presetParams } from './ProxyManager';
import { CommitInput } from './CommitInput';
import { paneFromHash } from './OptionsApp';

/** A config option held in memory, with a way to change it from elsewhere. */
const fakeOption = <T,>(initial: T) => {
  let observer: ((value: T) => void) | undefined;
  const option: ConfigurationOption<T> = {
    onChanged: new EventSink<T>(),
    getValue: async () => initial,
    setValue: vi.fn(async () => {}),
    observe: (callback) => {
      observer = callback;
      callback(initial);
    },
  };
  return { option, changeElsewhere: (value: T) => act(() => observer?.(value)) };
};

describe('settings', () => {
  test('a checkbox shows the option, follows outside changes and saves clicks', () => {
    const { option, changeElsewhere } = fakeOption(false);
    const { container: root, click } = render(<CheckboxSetting id="x" label="optionSyncContainers" option={option} />);
    const box = root.querySelector('input') as HTMLInputElement;
    expect([box.checked, root.querySelector('label')?.textContent]).toEqual([false, 'optionSyncContainers']);
    changeElsewhere(true);
    expect(box.checked).toBe(true);
    click(box);
    expect(box.checked).toBe(false);
    expect(option.setValue).toHaveBeenCalledWith(false);
  });

  test('a checkbox can save through its own function', () => {
    const { option } = fakeOption(false);
    const save = vi.fn(async () => {});
    const { container: root, click } = render(<CheckboxSetting id="x" label="l" option={option} save={save} />);
    click(root.querySelector('input'));
    expect(save).toHaveBeenCalledWith(true);
    expect(option.setValue).not.toHaveBeenCalled();
  });

  test('a select shows translated choices and saves the typed value', () => {
    const { option } = fakeOption(900);
    const { container: root } = render(
      <SelectSetting
        id="s"
        label="labelAutoDiscardMinAge"
        option={option}
        choices={[
          [-1, 'labelAutoDiscardDisabled'],
          [900, 'labelAutoDiscard900'],
        ]}
      />
    );
    const select = root.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['labelAutoDiscardDisabled', 'labelAutoDiscard900']);
    expect(select.value).toBe('900');
    act(() => {
      select.value = '-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(option.setValue).toHaveBeenCalledWith(-1);
  });
});

test('getListingRows lists containers and nested groups in order', () => {
  const snapshot = new TabGroupDirectorySnapshot({
    'tabarray-supergroup-0': {
      supergroupId: 0,
      name: '',
      members: ['firefox-default', 'tabarray-supergroup-1', 'firefox-gone'],
    },
    'tabarray-supergroup-1': { supergroupId: 1, name: 'Jobs', members: ['firefox-container-1'] },
  });
  const containers = new Map([
    ['firefox-default', container('firefox-default', 'No Container')],
    ['firefox-container-1', container('firefox-container-1', 'Work')],
  ]);
  expect(getListingRows(snapshot, containers).map((r) => [r.name, r.nesting, r.isGroup, r.maskedIcon])).toEqual([
    ['No Container', 0, false, true],
    ['Jobs', 0, true, true],
    ['Work', 1, false, false],
  ]);
});

describe('proxy form', () => {
  test('saves nothing without a hostname, and trims what it saves', () => {
    expect(presetParams({ ...EMPTY_FORM, hostname: '  ' })).toBeNull();
    expect(presetParams({ ...EMPTY_FORM, name: ' A ', hostname: ' h ', port: '8080' })).toEqual({
      title: 'A',
      type: ProxyType.HTTP,
      host: 'h',
      port: 8080,
      username: '',
      password: '',
      doNotProxyLocal: false,
      proxyDns: true,
    });
  });

  test('loads a preset, with DNS proxying on by default', () => {
    const form = formFromPreset({
      id: 'p',
      title: 'T',
      type: ProxyType.SOCKS5,
      host: 'h',
      port: 1,
      doNotProxyLocal: true,
    });
    expect(form).toEqual({
      id: 'p',
      name: 'T',
      protocol: ProxyType.SOCKS5,
      hostname: 'h',
      port: '1',
      username: '',
      password: '',
      doNotProxyLocal: true,
      proxyDns: true,
    });
  });
});

test('CommitInput reports an edit on Enter or blur, once', () => {
  const onCommit = vi.fn();
  const { container: root } = render(<CommitInput value="a" onCommit={onCommit} />);
  const input = root.querySelector('input') as HTMLInputElement;
  const type = (value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  type('b');
  expect(onCommit).not.toHaveBeenCalled();
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
  expect(onCommit.mock.calls).toEqual([['b']]);
});

test('paneFromHash defaults to the general pane', () => {
  expect([paneFromHash(''), paneFromHash('#proxies')]).toEqual(['general', 'proxies']);
});
