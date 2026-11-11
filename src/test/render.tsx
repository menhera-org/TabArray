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

import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

/** Renders `ui` into a fresh element and waits for React to finish. */
export const render = (ui: ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    rerender: (next: ReactNode) => act(() => root.render(next)),
    click: (element: Element | null) => act(() => (element as HTMLElement).click()),
  };
};

/** Drags `from` onto `to` and reports whether the drop was taken. */
export const dragAndDrop = (from: Element, to: Element): boolean => {
  // happy-dom's DragEvent drops the dataTransfer it is given.
  const data = new Map<string, string>();
  const dataTransfer = {
    dropEffect: 'none',
    setData: (format: string, value: string) => data.set(format, value),
    getData: (format: string) => data.get(format) ?? '',
  };
  const dragEvent = (type: string) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    return event;
  };
  const drop = dragEvent('drop');
  act(() => {
    from.dispatchEvent(dragEvent('dragstart'));
    to.dispatchEvent(drop);
  });
  return drop.defaultPrevented;
};
