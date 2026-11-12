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

import { expect, test, vi } from 'vitest';

import { pushKeyHandlers } from './keyHandlers';

test('Enter and Escape go to the newest handlers and do nothing else; other keys only when wanted', () => {
  const ok = vi.fn();
  const cancel = vi.fn();
  const keys = vi.fn((ev: KeyboardEvent) => ev.key == 'ArrowDown');
  pushKeyHandlers(ok, cancel, keys);
  const press = (key: string) => {
    const ev = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    document.body.dispatchEvent(ev);
    return ev.defaultPrevented;
  };
  expect([press('Enter'), press('Escape'), press('ArrowDown'), press('a')]).toEqual([true, true, true, false]);
  expect([ok.mock.calls.length, cancel.mock.calls.length, keys.mock.calls.length]).toEqual([1, 1, 2]);
});
