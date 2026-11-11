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

import { createContext, type RefObject, useContext, useEffect, useRef, useState } from 'react';

export type DebuggingScreenProps = {
  /** Shown, and owning the top bar. */
  active: boolean;
};

/** The element that scrolls the debugging screens. */
export const FrameContext = createContext<RefObject<HTMLElement | null>>({ current: null });

/** An EventSink of any value type. */
type ChangeSource = {
  addListener: (listener: () => void) => void;
  removeListener: (listener: () => void) => void;
};

/**
 * Loads a value when mounted and again whenever `onChanged` fires.
 * `beforeUpdate` runs just before a newly loaded value is shown.
 */
export const useLoaded = <T>(load: () => Promise<T>, onChanged?: ChangeSource, beforeUpdate?: () => void) => {
  const [value, setValue] = useState<T | null>(null);
  // The first arguments are kept: they are module-level services.
  const args = useRef({ load, onChanged, beforeUpdate });
  useEffect(() => {
    const { load, onChanged, beforeUpdate } = args.current;
    const reload = () => {
      load()
        .then((loaded) => {
          beforeUpdate?.();
          setValue(() => loaded);
        })
        // Reported to the browser console only: the old page left these failures (an AbortError
        // while the background is busy at startup) unhandled, so they never showed on the Logs screen.
        .catch((e) => console.error(e));
    };
    reload();
    onChanged?.addListener(reload);
    return () => onChanged?.removeListener(reload);
  }, []);
  return value;
};

/**
 * Keeps a log-like screen scrolled to its end: when it is shown, and when new rows arrive
 * while it was already scrolled to the end.
 */
export const useStickToBottom = (active: boolean) => {
  const frame = useContext(FrameContext);
  const wasAtBottom = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const scrollToBottom = () => {
    const element = frame.current;
    if (element && activeRef.current) element.scroll(0, element.scrollHeight - element.clientHeight);
  };
  useEffect(() => {
    if (active) scrollToBottom();
  }, [active]);
  return {
    /** Call just before new rows are shown. */
    measure: () => {
      const element = frame.current;
      wasAtBottom.current = element != null && element.scrollHeight - element.scrollTop - element.clientHeight < 1;
    },
    /** Call from a layout effect once the new rows are on the page. */
    afterUpdate: () => {
      if (wasAtBottom.current) scrollToBottom();
      wasAtBottom.current = false;
    },
  };
};
