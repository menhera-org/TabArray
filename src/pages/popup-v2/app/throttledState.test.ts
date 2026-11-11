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

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { EventSink } from 'weeg-events';

import { throttle } from './throttledState';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('reads the value once per burst of changes, at the end of the wait', () => {
  const source = { onChanged: new EventSink<void>(), value: 0 };
  const state = throttle(source, 200);
  const listener = vi.fn();
  state.subscribe(listener);
  expect(state.getSnapshot()).toBeNull();

  for (const value of [1, 2, 3]) {
    source.value = value;
    source.onChanged.dispatch();
  }
  vi.advanceTimersByTime(199);
  expect(listener).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(state.getSnapshot()).toBe(3);

  source.value = 4;
  source.onChanged.dispatch();
  vi.advanceTimersByTime(200);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(state.getSnapshot()).toBe(4);
});

test('stops notifying after unsubscribing', () => {
  const source = { onChanged: new EventSink<void>(), value: 0 };
  const state = throttle(source, 200);
  const listener = vi.fn();
  state.subscribe(listener)();
  source.onChanged.dispatch();
  vi.advanceTimersByTime(200);
  expect(listener).not.toHaveBeenCalled();
});
