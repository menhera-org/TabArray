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

import { useEffect, useRef, useState } from 'react';

/** An EventSink of any value type. */
export type ChangeSource = {
  addListener: (listener: () => void) => void;
  removeListener: (listener: () => void) => void;
};

/**
 * Loads a value when mounted and again whenever one of `changes` fires. Null until loaded.
 * `beforeUpdate` runs just before a newly loaded value is shown.
 * The arguments are taken once, when mounted: pass module-level services.
 */
export const useLoaded = <T>(
  load: () => Promise<T>,
  changes?: ChangeSource | ChangeSource[],
  beforeUpdate?: () => void
) => {
  const [value, setValue] = useState<T | null>(null);
  const args = useRef({ load, changes, beforeUpdate });
  useEffect(() => {
    const { load, changes, beforeUpdate } = args.current;
    const sources = changes == null ? [] : Array.isArray(changes) ? changes : [changes];
    const reload = () => {
      load()
        .then((loaded) => {
          beforeUpdate?.();
          setValue(() => loaded);
        })
        // Reported to the browser console only: a failed load keeps the previous value on screen.
        .catch((e) => console.error(e));
    };
    reload();
    for (const source of sources) source.addListener(reload);
    return () => {
      for (const source of sources) source.removeListener(reload);
    };
  }, []);
  return value;
};
