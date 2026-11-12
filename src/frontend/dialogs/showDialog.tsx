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

import { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ConfirmDialog } from './dialogs';

/**
 * Shows a dialog over the page, as its own React root at the end of the body.
 * `render` gets the function that closes it; so does the caller.
 */
export const showDialog = (render: (close: () => void) => ReactNode): (() => void) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.unmount();
    host.remove();
  };
  root.render(render(close));
  return close;
};

/** Asks to confirm `title`; resolves true for OK, false for Cancel or Escape. */
export const confirmAsync = (title: string): Promise<boolean> =>
  new Promise((resolve) => {
    showDialog((close) => (
      <ConfirmDialog
        title={title}
        onCancel={() => {
          close();
          resolve(false);
        }}
        onOk={() => {
          close();
          resolve(true);
        }}
      />
    ));
  });
