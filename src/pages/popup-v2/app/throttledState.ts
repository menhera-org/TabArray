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

import { EventSink } from 'weeg-events';

type Source<T> = { readonly onChanged: EventSink<void>; readonly value: T };

export type ThrottledState<T> = {
  subscribe: (listener: () => void) => () => void;
  /** null until the source first changes. */
  getSnapshot: () => T | null;
};

/**
 * A useSyncExternalStore source that takes the value at most once per `delay` ms:
 * a change starts a wait, further changes during it are folded in, and the value is read at its end.
 */
export const throttle = <T>(source: Source<T>, delay = 200): ThrottledState<T> => {
  let snapshot: T | null = null;
  let waiting = false;
  const listeners = new Set<() => void>();
  source.onChanged.addListener(() => {
    if (waiting) return;
    waiting = true;
    setTimeout(() => {
      waiting = false;
      snapshot = source.value;
      for (const listener of listeners) listener();
    }, delay);
  });
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
};
