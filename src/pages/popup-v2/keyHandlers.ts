/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

type KeyHandlers = {
  okHandler: (event?: Event) => void;
  cancelHandler: (event?: Event) => void;
  keyHandler?: (event: KeyboardEvent) => boolean;
};

const stack: KeyHandlers[] = [];

const catchEvent = (ev: Event) => {
  ev.preventDefault();
  ev.stopImmediatePropagation();
};

/** The popup's keyboard: the newest handlers get Enter, Escape and, if they want them, other keys. */
const onKeyDown = (ev: KeyboardEvent) => {
  const handlers = stack[stack.length - 1];
  if (!handlers) return;
  if (ev.key == 'Enter') {
    catchEvent(ev);
    handlers.okHandler(ev);
  } else if (ev.key == 'Escape') {
    catchEvent(ev);
    handlers.cancelHandler(ev);
  } else if (handlers.keyHandler?.(ev)) {
    catchEvent(ev);
  }
};

let installed = false;

export const pushKeyHandlers = (
  okHandler: (event?: Event) => void,
  cancelHandler: (event?: Event) => void,
  keyHandler?: (event: KeyboardEvent) => boolean
) => {
  if (!installed) {
    installed = true;
    document.addEventListener('keydown', onKeyDown, true);
  }
  stack.push({ okHandler, cancelHandler, keyHandler });
};
